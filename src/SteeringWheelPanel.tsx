import {
  PanelExtensionContext,
} from "@foxglove/extension";
import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// Define the configuration shape.
export interface SteeringWheelPanelConfig {
  general: {
    fontSize: number;    // default: 30
    precision: number;   // default: 1
    title: string;       // default: ""
  };
  series: {
    messagePath: string; // default: "/lexus3/pacmod/steering_cmd.command"
    unit: "deg" | "rad"; // default: "deg"
    scalingFactor: string; // default: "1.0" (accepts any string input)
  };
}

interface MyPanelExtensionContext extends PanelExtensionContext {
  config: unknown;
  onUpdateConfig: (newConfig: unknown) => void;
}

interface SteeringWheelPanelProps {
  context: PanelExtensionContext;
  config: SteeringWheelPanelConfig;
}

function SteeringWheelPanel({
  context,
  config,
}: SteeringWheelPanelProps): ReactElement {
  const [angle, setAngle] = useState(0);
  // Store the "done" callback from onRender so we can call it after render.
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    // Set up the onRender callback.
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      console.log("RenderState:", renderState);
      if (renderState.currentFrame) {
        for (const msgEvent of renderState.currentFrame) {
          console.log("Received message event:", msgEvent);
          if (msgEvent.topic === config.series.messagePath) {
            // Expect messages of the form { data: number }
            const value = (msgEvent.message as any)?.data;
            if (typeof value === "number") {
              // Apply scaling conversion before setting the angle.
              setAngle(value * parseFloat(config.series.scalingFactor));
              break;
            }
          }
        }
      }
    };

    // Subscribe to the topic specified in the configuration.
    context.subscribe([{ topic: config.series.messagePath }]);
    context.watch("currentFrame");
  }, [context, config.series.messagePath, config.series.scalingFactor]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ overflow: "visible" }}>
        {/* Wheel group rotates; text remains upright */}
        <g transform={`rotate(${angle}, 100, 100)`}>
          {/* Outer circle for the border */}
          <circle
            cx="100"
            cy="100"
            r="85"  // Slightly larger radius for the border
            stroke="#524994"  // Border color
            strokeWidth="5"  // Border width
            fill="none"
          />
          {/* Inner circle for the wheel */}
          <circle
            cx="100"
            cy="100"
            r="80"
            stroke="#524994"  // Stroke color for the circle
            strokeWidth="2"
            fill="none"
          />
          <line x1="100" y1="100" x2="100" y2="180" stroke="#524994" strokeWidth="5" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="#524994" strokeWidth="5" />
        </g>
        {/* Display text in the center; remains unrotated */}
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${config.general.fontSize}px`,
            fill: "white",
            stroke: "black",
            strokeWidth: "1",
          }}
        >
          {config.general.title ? `${config.general.title}: ` : ""}
          {angle.toFixed(config.general.precision)}
          {config.series.unit === "deg" ? "°" : " rad"}
        </text>
      </svg>
    </div>
  );
}

/**
 * The panel initializer.
 */
export function initSteeringWheelPanel(
  context: PanelExtensionContext
): () => void {
  const root = createRoot(context.panelElement);
  const myContext = context as MyPanelExtensionContext;
  const defaultConfig: SteeringWheelPanelConfig = {
    general: {
      fontSize: 30,
      precision: 1,
      title: "",
    },
    series: {
      messagePath: "/lexus3/pacmod/steering_cmd.command",
      unit: "deg",
      scalingFactor: "1.0",
    },
  };
  const config =
    (myContext.config as SteeringWheelPanelConfig) || defaultConfig;

  // Render the panel with the current configuration.
  root.render(<SteeringWheelPanel context={context} config={config} />);

  // Register a configuration update callback.
  myContext.onUpdateConfig = (newConfig: unknown) => {
    const updatedConfig: SteeringWheelPanelConfig = {
      ...defaultConfig,
      ...(newConfig as Partial<SteeringWheelPanelConfig>),
      general: {
        ...defaultConfig.general,
        ...((newConfig as any)?.general || {}),
      },
      series: {
        ...defaultConfig.series,
        ...((newConfig as any)?.series || {}),
      },
    };
    root.render(<SteeringWheelPanel context={context} config={updatedConfig} />);
    updateSettingsEditor(updatedConfig);
  };

  // Define and update the settings editor UI.
  function updateSettingsEditor(currentConfig: SteeringWheelPanelConfig) {
    const settingsTree = {
      nodes: {
        general: {
          label: "General",
          fields: {
            fontSize: {
              label: "Font Size (px)",
              input: "string" as const,
              value: currentConfig.general.fontSize.toString(),
            },
            precision: {
              label: "Precision",
              input: "string" as const,
              value: currentConfig.general.precision.toString(),
            },
            title: {
              label: "Title",
              input: "string" as const,
              value: currentConfig.general.title,
            },
          },
        },
        series: {
          label: "Series",
          fields: {
            messagePath: {
              label: "Message Path",
              input: "messagepath" as const,
              value: currentConfig.series.messagePath,
            },
            unit: {
              label: "Unit",
              input: "select" as const,
              options: [
                { label: "deg", value: "deg" },
                { label: "rad", value: "rad" },
              ],
              value: currentConfig.series.unit,
            },
            scalingFactor: {
              label: "Scaling Factor",
              input: "string" as const,
              value: currentConfig.series.scalingFactor,
            },
          },
        },
      },
      actionHandler: (action: any) => {
        if (
          action.action === "update" &&
          action.payload &&
          Array.isArray(action.payload.path)
        ) {
          // Ensure group is one of the allowed keys.
          const [group, field] = action.payload.path as [keyof SteeringWheelPanelConfig, string];
          let newValue = action.payload.value;
          let parsedValue: any = newValue;
          // For general numeric fields, parse the string to a float.
          if (group === "general" && (field === "fontSize" || field === "precision")) {
            parsedValue = parseFloat(newValue);
          }
          // For scalingFactor, just keep the string.
          if (group === "series" && field === "scalingFactor") {
            parsedValue = newValue;
          }
          const updatedConfig: SteeringWheelPanelConfig = {
            ...currentConfig,
            [group]: {
              ...currentConfig[group],
              [field]: parsedValue,
            },
          };
          myContext.onUpdateConfig(updatedConfig);
        }
      },
    };
    context.updatePanelSettingsEditor(settingsTree);
  }

  // Initialize the settings editor.
  updateSettingsEditor(config);

  return () => {
    root.unmount();
  };
}
