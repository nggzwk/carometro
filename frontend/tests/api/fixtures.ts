import { test as base } from "@playwright/test";
import { BasketClient } from "./clients/BasketClient";
import { GlobalClient } from "./clients/GlobalClient";
import { VegetableClient } from "./clients/VegetableClient";

type ApiFixtures = {
  basket: BasketClient;
  globalBaskets: GlobalClient;
  vegetable: VegetableClient;
};

export const test = base.extend<ApiFixtures>({
  basket: async ({ request }, use) => use(new BasketClient(request)),
  globalBaskets: async ({ request }, use) => use(new GlobalClient(request)),
  vegetable: async ({ request }, use) => use(new VegetableClient(request)),
});

export { expect } from "@playwright/test";
