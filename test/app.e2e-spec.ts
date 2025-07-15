import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';


// test the app controller
describe('AppController (e2e)', () => {
  let app: INestApplication;
  // before each test, create a new instance of the AppModule
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // test that the app is running
  it('/ (GET) should return Hello World!', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // test that the app can return profit result for valid input
  it('/api/profit (POST) should return profit result for valid input', async () => {
    // Get min/max from the API first
    const apiKey = process.env.API_KEY || '';
    const minmax = await request(app.getHttpServer())
      .get('/api/profit/minmax')
      .set('x-api-key', apiKey );
    expect(minmax.status).toBe(200);
    const { min, max } = minmax.body;
    const res = await request(app.getHttpServer())
      .post('/api/profit')
      .set('x-api-key', apiKey)
      .send({
        startTime: min,
        endTime: max,
        funds: 1000
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('buyTime');
    expect(res.body).toHaveProperty('sellTime');
    expect(res.body).toHaveProperty('netProfit');
  });
});
