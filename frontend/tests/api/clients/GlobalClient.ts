import { APIRequestContext, APIResponse } from "@playwright/test";

const BASE = "http://localhost:8000/api/global-baskets";

export class GlobalClient {
  constructor(private readonly req: APIRequestContext) {}

  getReferences(): Promise<APIResponse> {
    return this.req.get(BASE);
  }

  getDieeseItems(monthRef?: string): Promise<APIResponse> {
    const params = monthRef !== undefined ? { month_ref: monthRef } : undefined;
    return this.req.get(`${BASE}/dieese`, { params });
  }

  getDieeseWage(monthRef?: string): Promise<APIResponse> {
    const params = monthRef !== undefined ? { month_ref: monthRef } : undefined;
    return this.req.get(`${BASE}/dieese/wage`, { params });
  }

  getDieeseInflationAnnual(): Promise<APIResponse> {
    return this.req.get(`${BASE}/dieese/inflation/annual`);
  }
}
