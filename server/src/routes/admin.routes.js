const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const services = require('../controllers/service.controller');
const reservations = require('../controllers/reservation.controller');
const users = require('../controllers/user.controller');
const social = require('../controllers/social.controller');
const contact = require('../controllers/contact.controller');
const chat = require('../controllers/chat.controller');
const validate = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const { authenticate, authorize } = require('../middleware/auth');
const { createServiceSchema, updateServiceSchema } = require('../validators/service.validators');
const { adminReservationQuery, adminReservationUpdateSchema } = require('../validators/reservation.validators');
const { adminUserQuery, adminCreateUserSchema, adminUpdateUserSchema } = require('../validators/user.validators');
const { createSocialSchema, updateSocialSchema } = require('../validators/social.validators');
const { adminContactQuery, adminContactUpdateSchema } = require('../validators/contact.validators');
const { createFaqSchema, updateFaqSchema, adminChatLogQuery } = require('../validators/chat.validators');

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/summary', adminController.summary);

router.get('/services', services.adminList);
router.post('/services', validate(createServiceSchema), services.adminCreate);
router.patch('/services/:id', validateObjectId('id'), validate(updateServiceSchema), services.adminUpdate);
router.delete('/services/:id', validateObjectId('id'), services.adminRemove);

router.get('/reservations', validate(adminReservationQuery, 'query'), reservations.adminList);
router.patch('/reservations/:id', validateObjectId('id'), validate(adminReservationUpdateSchema), reservations.adminUpdate);
router.delete('/reservations/:id', validateObjectId('id'), reservations.adminRemove);

router.get('/users', validate(adminUserQuery, 'query'), users.adminList);
router.post('/users', validate(adminCreateUserSchema), users.adminCreate);
router.patch('/users/:id', validateObjectId('id'), validate(adminUpdateUserSchema), users.adminUpdate);

router.get('/social-links', social.adminList);
router.post('/social-links', validate(createSocialSchema), social.adminCreate);
router.patch('/social-links/:id', validateObjectId('id'), validate(updateSocialSchema), social.adminUpdate);
router.delete('/social-links/:id', validateObjectId('id'), social.adminRemove);

router.get('/contact-messages', validate(adminContactQuery, 'query'), contact.adminList);
router.patch('/contact-messages/:id', validateObjectId('id'), validate(adminContactUpdateSchema), contact.adminUpdate);
router.delete('/contact-messages/:id', validateObjectId('id'), contact.adminRemove);

router.get('/chat-faqs', chat.adminListFaqs);
router.post('/chat-faqs', validate(createFaqSchema), chat.adminCreateFaq);
router.patch('/chat-faqs/:id', validateObjectId('id'), validate(updateFaqSchema), chat.adminUpdateFaq);
router.delete('/chat-faqs/:id', validateObjectId('id'), chat.adminRemoveFaq);

router.get('/chat-logs', validate(adminChatLogQuery, 'query'), chat.adminListLogs);
router.delete('/chat-logs/:id', validateObjectId('id'), chat.adminRemoveLog);

module.exports = router;
