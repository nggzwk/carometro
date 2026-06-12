import { APIRequestContext, APIResponse } from "@playwright/test";

const BASE = "http://localhost:8000/api/vegetable-basket";

export class VegetableClient {
  constructor(private readonly req: APIRequestContext) {}

  getItemsPrice(monthRef?: string): Promise<APIResponse> {
    const params = monthRef !== undefined ? { month_ref: monthRef } : undefined;
    return this.req.get(`${BASE}/items/price`, { params });
  }

  getVillains(year?: number | string): Promise<APIResponse> {
    const params = year !== undefined ? { year } : undefined;
    return this.req.get(`${BASE}/villains`, { params });
  }

  getWage(monthRef?: string): Promise<APIResponse> {
    const params = monthRef !== undefined ? { month_ref: monthRef } : undefined;
    return this.req.get(`${BASE}/wage`, { params });
  }

  getHours(monthRef?: string): Promise<APIResponse> {
    const params = monthRef !== undefined ? { month_ref: monthRef } : undefined;
    return this.req.get(`${BASE}/hours`, { params });
  }

  getInflationMonth(monthRef?: string): Promise<APIResponse> {
    const params = monthRef !== undefined ? { month_ref: monthRef } : undefined;
    return this.req.get(`${BASE}/inflation/month`, { params });
  }

  getInflationAnnual(): Promise<APIResponse> {
    return this.req.get(`${BASE}/inflation/annual`);
  }
}
