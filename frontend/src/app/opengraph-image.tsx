import { ImageResponse } from "next/og";

export const alt = "Carômetro — A inflação da cesta básica curitibana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffffff",
                    color: "#1A120B",
                }}
            >
                <div style={{ display: "flex", fontSize: 96, marginBottom: 24 }}>🛒</div>

                <div
                    style={{
                        fontSize: 120,
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        paddingLeft: "0.18em",
                    }}
                >
                    Carômetro
                </div>

                <div
                    style={{
                        width: 760,
                        height: 2,
                        background: "#1A120B",
                        marginTop: 28,
                        marginBottom: 28,
                    }}
                />

                <div
                    style={{
                        fontSize: 34,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "#5C5146",
                    }}
                >
                    A inflação da cesta básica curitibana
                </div>
            </div>
        ),
        { ...size }
    );
}
