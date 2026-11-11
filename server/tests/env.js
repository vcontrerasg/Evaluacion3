process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/andes_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'clave-de-pruebas-con-mas-de-treinta-y-dos-caracteres';
process.env.JWT_ACCESS_TTL = '15m';
