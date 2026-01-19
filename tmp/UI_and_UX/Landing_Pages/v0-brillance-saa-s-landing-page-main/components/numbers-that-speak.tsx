import type React from "react"

interface NumbersThatSpeakProps {
  /** Fixed width from Figma: 482px */
  width?: number | string
  /** Fixed height from Figma: 300px */
  height?: number | string
  /** Optional className to pass to root */
  className?: string
  /** Theme palette */
  theme?: "light" | "dark"
}

/**
 * Numbers that speak – Financial dashboard with layered charts
 * Generated from Figma via MCP with exact measurements (482×300px)
 * Single-file component following the v0-ready pattern used in this repo.
 */
const NumbersThatSpeak: React.FC<NumbersThatSpeakProps> = ({
  width = 482,
  height = 300,
  className = "",
  theme = "dark",
}) => {
  // Design tokens (derived from Figma local variables)
  const themeVars =
    theme === "light"
      ? {
          "--nts-surface": "#ffffff",
          "--nts-text-primary": "#2f3037",
          "--nts-text-secondary": "rgba(47,48,55,0.8)",
          "--nts-text-muted": "rgba(55,50,47,0.7)",
          "--nts-border": "rgba(47,48,55,0.12)",
          "--nts-shadow": "rgba(47,48,55,0.06)",
        }
      : ({
          "--nts-surface": "#ffffff",
          "--nts-text-primary": "#2f3037",
          "--nts-text-secondary": "rgba(47,48,55,0.8)",
          "--nts-text-muted": "rgba(55,50,47,0.7)",
          "--nts-border": "rgba(47,48,55,0.12)",
          "--nts-shadow": "rgba(47,48,55,0.06)",
        } as React.CSSProperties)

  // Figma-exported assets
  const imgSchedule = "/placeholder.svg?height=271&width=431"
  const imgYAxisLine = "/placeholder.svg?height=17&width=295"
  const imgYAxisLine1 = "/placeholder.svg?height=13&width=295"
  const imgYAxisLine2 = "/placeholder.svg?height=13&width=295"

  return (
    <div
      className={className}
      style={
        {
          width,
          height,
          position: "relative",
          background: "transparent",
          ...themeVars,
        } as React.CSSProperties
      }
      role="img"
      aria-label="Financial dashboard showing invoiced revenue charts"
      data-name="Numbers that speak"
      data-node-id="454:5856"
    >
      {/* Root positioning container - exact match to Figma */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: "calc(50% + 23.703px)",
        }}
      >
        {/* Small dashboard card - back layer */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            top: "calc(50% - 19.427px)",
            width: "270px",
            height: "199.565px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div>
            <div
              className="border border-[rgba(0,0,0,0.08)]"
              style={{
                width: "270px",
                height: "199.565px",
                background: "var(--nts-surface)",
                borderRadius: "4.696px",
                boxShadow:
                  "0px 0px 0px 0.587px rgba(47,48,55,0.12), 0px 1.174px 2.348px -0.587px rgba(47,48,55,0.06), 0px 1.761px 3.522px -0.88px rgba(47,48,55,0.06)",
                maskImage: `url('${imgSchedule}')`,
                maskPosition: "-81.766px -1.312px",
                maskSize: "430.746px 270.521px",
                maskRepeat: "no-repeat",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                alignItems: "flex-start",
              }}
            />
          </div>
        </div>

        {/* Medium dashboard card - middle layer */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            top: "calc(50% + 12.573px)",
            width: "330px",
            height: "243.913px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div>
            <div
              className="border border-[rgba(0,0,0,0.08)]"
              style={{
                width: "330px",
                height: "243.913px",
                background: "var(--nts-surface)",
                borderRadius: "5.739px",
                boxShadow:
                  "0px 0px 0px 0.717px rgba(47,48,55,0.12), 0px 1.435px 2.87px -0.717px rgba(47,48,55,0.06), 0px 2.152px 4.304px -1.076px rgba(47,48,55,0.06)",
                maskImage: `url('${imgSchedule}')`,
                maskPosition: "-51.766px -11.138px",
                maskSize: "430.746px 270.521px",
                maskRepeat: "no-repeat",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                alignItems: "flex-start",
              }}
            />
          </div>
        </div>

        {/* Large dashboard card - front layer with full content */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            top: "calc(50% + 33.573px)",
            width: "360px",
            height: "266.087px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div>
            <div
              className="border border-[rgba(0,0,0,0.08)]"
              style={{
                width: "360px",
                height: "266.087px",
                background: "var(--nts-surface)",
                borderRadius: "6.261px",
                boxShadow:
                  "0px 0px 0px 0.783px rgba(47,48,55,0.12), 0px 1.565px 3.13px -0.783px rgba(47,48,55,0.06), 0px 2.348px 4.696px -1.174px rgba(47,48,55,0.06)",
                maskImage: `url('${imgSchedule}')`,
                maskPosition: "-36.766px -21.051px",
                maskSize: "430.746px 270.521px",
                maskRepeat: "no-repeat",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                alignItems: "flex-start",
                padding: "18.783px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "37.565px",
                  width: "100%",
                  height: "100%",
                  flexGrow: 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "18.783px",
                    width: "100%",
                    height: "100%",
                    flexGrow: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "18.783px",
                      width: "100%",
                      height: "100%",
                      flexGrow: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        width: "100%",
                        height: "100%",
                        flexGrow: 1,
                      }}
                    >
                      {/* Header Section */}
                      <div
                        style={{
                          display: "flex",
                          gap: "6.261px",
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6.261px",
                            alignItems: "flex-start",
                            justifyContent: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontWeight: 600,
                              fontSize: "10.174px",
                              lineHeight: "18.783px",
                              color: "var(--nts-text-secondary)",
                              whiteSpace: "pre",
                            }}
                          >
                            Invoiced Revenue
                          </div>
                          <div
                            className="tracking-widest"
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontWeight: 500,
                              fontSize: "18.783px",
                              lineHeight: "20.348px",
                              letterSpacing: "-0.587px",
                              color: "var(--nts-text-primary)",
                              whiteSpace: "pre",
                            }}
                          >
                            $317,731.00
                          </div>
                        </div>
                      </div>

                      {/* Chart Container */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "18.783px",
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            height: "156.522px",
                            position: "relative",
                            width: "100%",
                          }}
                        >
                          {/* Chart Axis */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              gap: "3.13px",
                              alignItems: "flex-start",
                              justifyContent: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexGrow: 1,
                                height: "100%",
                                alignItems: "flex-start",
                                justifyContent: "flex-start",
                                position: "relative",
                              }}
                            >
                              {/* Y-Axis Labels */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  height: "100%",
                                  alignItems: "flex-start",
                                  justifyContent: "center",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    flexGrow: 1,
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    paddingLeft: 0,
                                    paddingRight: "7.826px",
                                    paddingTop: 0,
                                    paddingBottom: 0,
                                    boxSizing: "border-box",
                                  }}
                                >
                                  {["500k", "300k", "200k", "100k", "0"].map((label, index) => (
                                    <div
                                      key={index}
                                      style={{
                                        display: "flex",
                                        gap: "6.261px",
                                        height: "17.217px",
                                        alignItems: "center",
                                        justifyContent: "flex-end",
                                        paddingLeft: 0,
                                        paddingRight: 0,
                                        paddingTop: "8.609px",
                                        paddingBottom: "8.609px",
                                        width: "100%",
                                        boxSizing: "border-box",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontFamily: "'Inter', sans-serif",
                                          fontWeight: 500,
                                          fontSize: "7.826px",
                                          lineHeight: "14.087px",
                                          color: "var(--nts-text-muted)",
                                          textAlign: "right",
                                          whiteSpace: "pre",
                                        }}
                                      >
                                        {label}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Grid Lines and X-Axis */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  flexGrow: 1,
                                  height: "100%",
                                  alignItems: "flex-start",
                                  justifyContent: "flex-start",
                                }}
                              >
                                {/* Grid Lines */}
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    flexGrow: 1,
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    width: "100%",
                                  }}
                                >
                                  <div
                                    style={{ height: "17.217px", width: "100%", display: "flex", alignItems: "center" }}
                                  >
                                    <div
                                      style={{ width: "100%", height: "1px", backgroundColor: "rgba(0,0,0,0.05)" }}
                                    />
                                  </div>
                                  <div
                                    style={{ height: "13.304px", width: "100%", display: "flex", alignItems: "center" }}
                                  >
                                    <div
                                      style={{ width: "100%", height: "1px", backgroundColor: "rgba(0,0,0,0.05)" }}
                                    />
                                  </div>
                                  <div
                                    style={{ height: "13.304px", width: "100%", display: "flex", alignItems: "center" }}
                                  >
                                    <div
                                      style={{ width: "100%", height: "1px", backgroundColor: "rgba(0,0,0,0.05)" }}
                                    />
                                  </div>
                                  <div
                                    style={{ height: "13.304px", width: "100%", display: "flex", alignItems: "center" }}
                                  >
                                    <div
                                      style={{ width: "100%", height: "1px", backgroundColor: "rgba(0,0,0,0.05)" }}
                                    />
                                  </div>
                                  <div
                                    style={{ height: "13.304px", width: "100%", display: "flex", alignItems: "center" }}
                                  >
                                    <div
                                      style={{ width: "100%", height: "1px", backgroundColor: "rgba(0,0,0,0.05)" }}
                                    />
                                  </div>
                                  <div
                                    style={{ height: "13.304px", width: "100%", display: "flex", alignItems: "center" }}
                                  >
                                    <div
                                      style={{ width: "100%", height: "1px", backgroundColor: "rgba(0,0,0,0.05)" }}
                                    />
                                  </div>
                                </div>

                                {/* X-Axis Labels */}
                                <div
                                  style={{
                                    display: "flex",
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 500,
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    fontSize: "7.826px",
                                    lineHeight: "14.087px",
                                    paddingLeft: "6.261px",
                                    paddingRight: "6.261px",
                                    paddingTop: 0,
                                    paddingBottom: 0,
                                    boxSizing: "border-box",
                                    color: "var(--nts-text-muted)",
                                    textAlign: "right",
                                    width: "100%",
                                  }}
                                >
                                  <div style={{ whiteSpace: "pre" }}>Aug 2023</div>
                                  <div style={{ whiteSpace: "pre" }}>Aug 2024</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Chart Data Bars */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: "23.48px",
                              right: 0,
                              top: "12.52px",
                              width: "295.043px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                bottom: 0,
                                left: "-1.56px",
                                right: 0,
                                top: 0,
                                display: "flex",
                                alignItems: "flex-end",
                                justifyContent: "space-between",
                                paddingLeft: "9.391px",
                                paddingRight: "9.391px",
                                paddingTop: 0,
                                paddingBottom: 0,
                                boxSizing: "border-box",
                                overflow: "hidden",
                              }}
                            >
                              {[
                                { height: "83px", color: "#5D4E37" },
                                { height: "108px", color: "#5D4E37" },
                                { height: "58px", color: "#5D4E37" },
                                { height: "89px", color: "#5D4E37" },
                                { height: "83px", color: "#5D4E37" },
                                { height: "89px", color: "#5D4E37" },
                                { height: "83px", color: "#5D4E37" },
                                { height: "95px", color: "#5D4E37" },
                                { height: "108px", color: "#5D4E37" },
                                { height: "76px", color: "#5D4E37" },
                                { height: "89px", color: "#5D4E37" },
                              ].map((item, index) => (
                                <div
                                  key={index}
                                  style={{
                                    width: "12.522px",
                                    height: item.height,
                                    backgroundColor: item.color,
                                    borderRadius: "2px",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NumbersThatSpeak
