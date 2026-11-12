const AppError = require('../utils/AppError');
const SocialLink = require('../models/SocialLink');
const { normalizeUrl } = require('../validators/social.validators');

async function listPublic(req, res, next) {
  try {
    const links = await SocialLink.find({ active: true }).sort({ order: 1, network: 1 });
    res.json({ links: links.map((l) => l.toPublic()) });
  } catch (err) {
    next(err);
  }
}

async function adminList(req, res, next) {
  try {
    const links = await SocialLink.find({}).sort({ order: 1, network: 1 });
    res.json({ links: links.map((l) => l.toPublic()) });
  } catch (err) {
    next(err);
  }
}

async function adminCreate(req, res, next) {
  try {
    const data = { ...req.body, url: normalizeUrl(req.body.url, req.body.network) };
    const link = await SocialLink.create(data);
    res.status(201).json({ link: link.toPublic() });
  } catch (err) {
    if (err.code === 11000) return next(new AppError(409, 'Ya existe un enlace para esa red social', 'network_exists'));
    return next(err);
  }
}

async function adminUpdate(req, res, next) {
  try {
    const link = await SocialLink.findById(req.params.id);
    if (!link) throw new AppError(404, 'Enlace no encontrado', 'link_not_found');

    if (req.body.url !== undefined) {
      const normalized = normalizeUrl(req.body.url, link.network);
      if (!normalized) {
        const err = new AppError(400, 'Los datos enviados no son válidos', 'validation_error');
        err.fields = { url: `Ingresa un enlace https válido de ${link.network}` };
        throw err;
      }
      req.body.url = normalized;
    }
    Object.assign(link, req.body);
    await link.save();
    res.json({ link: link.toPublic() });
  } catch (err) {
    next(err);
  }
}

async function adminRemove(req, res, next) {
  try {
    const link = await SocialLink.findById(req.params.id);
    if (!link) throw new AppError(404, 'Enlace no encontrado', 'link_not_found');
    await link.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listPublic, adminList, adminCreate, adminUpdate, adminRemove };
