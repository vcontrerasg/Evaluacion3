const crypto = require('crypto');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const ChatFaq = require('../models/ChatFaq');
const ChatLog = require('../models/ChatLog');
const Service = require('../models/Service');
const { bestMatch, isGreeting, normalize } = require('../services/chatMatcher');
const ai = require('../services/ai.service');

const GREETING_REPLY = 'Hola, soy el asistente virtual de Andes Consultores. Puedo ayudarte con horarios, servicios, reservas y contacto. ¿Qué necesitas saber?';
const FALLBACK_REPLY = 'No tengo una respuesta para eso todavía. Puedes escribirnos desde la página de Contacto y te responderemos por correo.';

function uniqueKeywords(list) {
  const seen = new Set();
  const out = [];
  for (const k of list || []) {
    const key = normalize(k);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(k.trim());
    }
  }
  return out;
}

async function aiAllowed() {
  if (!ai.isEnabled()) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await ChatLog.countDocuments({ source: 'ai', createdAt: mongoose.trusted({ $gt: since }) });
  return used < env.CHAT_AI_DAILY_LIMIT;
}

async function suggestionList() {
  const faqs = await ChatFaq.find({ active: true }).sort({ order: 1, createdAt: 1 }).limit(4);
  return faqs.map((f) => ({ id: f._id.toString(), question: f.question }));
}

async function ask(req, res, next) {
  try {
    const text = req.body.message;
    const sessionId = req.body.sessionId || crypto.randomUUID();

    let reply;
    let source;
    let faqId = null;

    if (isGreeting(text)) {
      reply = GREETING_REPLY;
      source = 'greeting';
    } else {
      const faqs = await ChatFaq.find({ active: true }).sort({ order: 1, createdAt: 1 });
      const match = bestMatch(text, faqs);
      if (match) {
        reply = match.faq.answer;
        source = 'faq';
        faqId = match.faq._id;
      } else {
        reply = null;
        if (await aiAllowed()) {
          try {
            const services = await Service.find({ active: true }).sort({ name: 1 });
            reply = await ai.ask({ message: text, services, faqs });
          } catch (err) {
            if (!env.isTest) console.error(`[chat] fallo del servicio de IA: ${err.name}`);
            reply = null;
          }
        }
        if (reply) {
          source = 'ai';
        } else {
          reply = FALLBACK_REPLY;
          source = 'fallback';
        }
      }
    }

    try {
      await ChatLog.create({ sessionId, message: text, reply, source, faq: faqId });
    } catch (err) {
      if (!env.isTest) console.error('[chat] no se pudo registrar la conversación');
    }

    const suggestions = source === 'fallback' ? await suggestionList() : [];
    res.json({ reply, source, sessionId, suggestions });
  } catch (err) {
    next(err);
  }
}

async function suggestions(req, res, next) {
  try {
    res.json({ suggestions: await suggestionList() });
  } catch (err) {
    next(err);
  }
}

async function adminListFaqs(req, res, next) {
  try {
    const faqs = await ChatFaq.find({}).sort({ order: 1, createdAt: 1 });
    res.json({ faqs: faqs.map((f) => f.toPublic()) });
  } catch (err) {
    next(err);
  }
}

async function adminCreateFaq(req, res, next) {
  try {
    const faq = await ChatFaq.create({ ...req.body, keywords: uniqueKeywords(req.body.keywords) });
    res.status(201).json({ faq: faq.toPublic() });
  } catch (err) {
    next(err);
  }
}

async function adminUpdateFaq(req, res, next) {
  try {
    const faq = await ChatFaq.findById(req.params.id);
    if (!faq) throw new AppError(404, 'Pregunta no encontrada', 'faq_not_found');
    const data = { ...req.body };
    if (data.keywords) data.keywords = uniqueKeywords(data.keywords);
    Object.assign(faq, data);
    await faq.save();
    res.json({ faq: faq.toPublic() });
  } catch (err) {
    next(err);
  }
}

async function adminRemoveFaq(req, res, next) {
  try {
    const faq = await ChatFaq.findById(req.params.id);
    if (!faq) throw new AppError(404, 'Pregunta no encontrada', 'faq_not_found');
    await faq.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function adminListLogs(req, res, next) {
  try {
    const { page, limit, source } = req.query;
    const filter = source ? { source } : {};
    const [items, total] = await Promise.all([
      ChatLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      ChatLog.countDocuments(filter)
    ]);
    res.json({ logs: items.map((l) => l.toPublic()), page, limit, total });
  } catch (err) {
    next(err);
  }
}

async function adminRemoveLog(req, res, next) {
  try {
    const log = await ChatLog.findById(req.params.id);
    if (!log) throw new AppError(404, 'Conversación no encontrada', 'log_not_found');
    await log.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { ask, suggestions, adminListFaqs, adminCreateFaq, adminUpdateFaq, adminRemoveFaq, adminListLogs, adminRemoveLog };
