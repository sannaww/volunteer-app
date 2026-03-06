import { render, screen } from "@testing-library/react";

import App from "./App";
import api from "./api/client";

jest.mock("./api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn((url) => {
      if (url.startsWith("/api/projects")) {
        return Promise.resolve({ data: [] });
      }

      return Promise.resolve({ data: {} });
    }),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock("./api/socket", () => ({
  createSocket: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

describe("App shell", () => {
  let warnSpy;

  beforeEach(() => {
    window.sessionStorage.clear();
    api.get.mockResolvedValue({ data: [] });
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  test("renders the public navigation and project catalog", async () => {
    render(<App />);

    expect(await screen.findByRole("link", { name: /войти/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /регистрация/i })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: /волонтерские проекты/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/проекты не найдены/i)).toBeInTheDocument();
  });
});
