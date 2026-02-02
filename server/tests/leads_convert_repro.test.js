const request = require('supertest');
const { app } = require('../index.js');
const db = require('../db.js');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({ text: "Mocked response" })
    }
  }))
}));

jest.mock('../services.js', () => ({
  sendWhatsApp: jest.fn(),
  analyzeLeadIntent: jest.fn().mockResolvedValue({ isLead: true, intent: 'SALES' })
}));

jest.mock('../pdfGenerator.js', () => ({
  generateQuotePDF: jest.fn()
}));

const JWT_SECRET = process.env.JWT_SECRET || 'superair_secret_key_2024';
const adminToken = jwt.sign({ id: 1, email: 'admin@superair.com.mx', role: 'Super Admin', name: 'Admin' }, JWT_SECRET);

describe('Lead Conversion Test', () => {
  let leadId;

  beforeAll(async () => {
    // Clean up
    await db.query("DELETE FROM leads WHERE email = 'convert_test@example.com'");
    await db.query("DELETE FROM clients WHERE email = 'convert_test@example.com'");

    // Create a lead to convert
    const res = await request(app)
      .post('/api/leads')
      .send({
        name: 'Convert Test Lead',
        email: 'convert_test@example.com',
        phone: '5551234567',
        source: 'Test',
        status: 'Nuevo'
      });
    leadId = res.body.id;
  });

  afterAll(async () => {
    // Cleanup
    if (leadId) await db.query("DELETE FROM leads WHERE id = $1", [leadId]);
    await db.query("DELETE FROM clients WHERE email = 'convert_test@example.com'");
    await db.end(); // Close pool
  });

  test('Should fail to convert if DB state is invalid (simulated)', async () => {
     // This test is to reproduce the issue.
     // We will first try a normal conversion.
     const res = await request(app)
       .post(`/api/leads/${leadId}/convert`)
       .set('Authorization', `Bearer ${adminToken}`);

     if (res.status !== 200) {
       console.error("Conversion failed:", res.body);
     }

     expect(res.status).toBe(200);
     expect(res.body.success).toBe(true);
     expect(res.body.clientId).toBeDefined();
  });
});
