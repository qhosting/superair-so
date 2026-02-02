import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock dependencies before importing app
// We need to mock db.js to avoid real DB connection and allow spying on queries
// Since db.js exports named exports, we mock them.
jest.unstable_mockModule('../db.js', () => ({
    initDatabase: jest.fn(),
    query: jest.fn(),
    pool: { connect: jest.fn(), on: jest.fn() }
}));

// Mock @google/genai to avoid import errors in Jest
jest.unstable_mockModule('@google/genai', () => ({
    GoogleGenAI: class {
        constructor() {
            this.models = { generateContent: jest.fn() };
        }
    },
    SchemaType: { STRING: 'STRING' }
}));

const { query } = await import('../db.js');
const { app } = await import('../index.js');

const JWT_SECRET = process.env.JWT_SECRET || 'superair_secret_key_2024';

describe('DELETE /api/leads/:id', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if no token provided', async () => {
        const res = await request(app).delete('/api/leads/123');
        expect(res.status).toBe(401);
    });

    it('should return 403 if user is not Admin', async () => {
        const token = jwt.sign({ id: 1, role: 'Instalador', name: 'Test User' }, JWT_SECRET);
        const res = await request(app)
            .delete('/api/leads/123')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    it('should delete lead if user is Super Admin', async () => {
        const token = jwt.sign({ id: 1, role: 'Super Admin', name: 'Admin User' }, JWT_SECRET);

        // Mock query response for DELETE
        // The controller expects: result.rows.length === 0 -> 404
        // success -> result.rows = [{id: 123}]
        query.mockResolvedValueOnce({ rows: [{ id: 123 }] });

        const res = await request(app)
            .delete('/api/leads/123')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM leads'),
            expect.arrayContaining(['123']) // Note: 123 passed as string in URL but cast in query
        );
    });

    it('should return 404 if lead not found', async () => {
        const token = jwt.sign({ id: 1, role: 'Super Admin', name: 'Admin User' }, JWT_SECRET);

        // Mock query response: empty rows
        query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .delete('/api/leads/999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Lead no encontrado');
    });

    it('should return 500 on db error', async () => {
        const token = jwt.sign({ id: 1, role: 'Super Admin', name: 'Admin User' }, JWT_SECRET);

        query.mockRejectedValueOnce(new Error('DB Connection Failed'));

        const res = await request(app)
            .delete('/api/leads/123')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(500);
        expect(res.body.error).toContain('Error al eliminar lead');
    });
});
