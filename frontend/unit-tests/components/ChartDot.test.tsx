import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ChartDot } from "../../src/components/graphs/Axis/ChartDot";

vi.mock("../../src/components/graphs/Axis/ChartDot.module.css", () => ({
  default: {},
  dotGroup: "dotGroup",
  glowRing: "glowRing",
  circle: "circle",
  hoveredCircle: "hoveredCircle",
  icon: "icon",
}));

const baseProps = {
  cx: 100,
  cy: 80,
  icon: "🍚",
  isHovered: false,
  onMouseEnter: vi.fn(),
  onMouseLeave: vi.fn(),
  onClick: vi.fn(),
};

describe("ChartDot", () => {
  it("renders a <g> element with the given id", () => {
    const { container } = render(
      <svg>
        <ChartDot {...baseProps} id="line-dot-2023" />
      </svg>,
    );
    const g = container.querySelector("g#line-dot-2023");
    expect(g).not.toBeNull();
  });

  it("renders nothing when cx is null", () => {
    const { container } = render(
      <svg>
        <ChartDot {...baseProps} cx={null as any} />
      </svg>,
    );
    expect(container.querySelector("g")).toBeNull();
  });

  it("renders nothing when cy is null", () => {
    const { container } = render(
      <svg>
        <ChartDot {...baseProps} cy={null as any} />
      </svg>,
    );
    expect(container.querySelector("g")).toBeNull();
  });

  it("does not render a glow ring when isHovered=false", () => {
    const { container } = render(
      <svg>
        <ChartDot {...baseProps} isHovered={false} />
      </svg>,
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(1);
  });

  it("renders an extra glow ring circle when isHovered=true", () => {
    const { container } = render(
      <svg>
        <ChartDot {...baseProps} isHovered={true} />
      </svg>,
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
  });

  it("uses a larger radius when hovered", () => {
    const { container: hovered } = render(
      <svg>
        <ChartDot {...baseProps} isHovered={true} />
      </svg>,
    );
    const { container: normal } = render(
      <svg>
        <ChartDot {...baseProps} isHovered={false} />
      </svg>,
    );

    const hoveredR = parseInt(
      hovered.querySelectorAll("circle")[1].getAttribute("r") ?? "0",
      10,
    );
    const normalR = parseInt(
      normal.querySelector("circle")!.getAttribute("r") ?? "0",
      10,
    );

    expect(hoveredR).toBeGreaterThan(normalR);
  });

  it("renders the icon text inside the dot", () => {
    const { container } = render(
      <svg>
        <ChartDot {...baseProps} icon="🍚" />
      </svg>,
    );
    expect(container.querySelector("text")?.textContent).toBe("🍚");
  });

  it("applies the transform with cx/cy coordinates", () => {
    const { container } = render(
      <svg>
        <ChartDot {...baseProps} cx={42} cy={77} />
      </svg>,
    );
    expect(container.querySelector("g")?.getAttribute("transform")).toBe(
      "translate(42, 77)",
    );
  });
});
