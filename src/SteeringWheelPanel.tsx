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
    messagePath: string;
    unit: "deg" | "rad"; // default: "deg"
    scalingFactor: string; // default: "1.0" (accepts any string input)
    numberScalingFactor: string; // default: "1.0" (accepts any string input)
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

/**
 * Helper to extract a nested value from an object using a dot-separated path.
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

function SteeringWheelPanel({
  context,
  config,
}: SteeringWheelPanelProps): ReactElement {
  const [angle, setAngle] = useState(0);
  // Store the "done" callback from onRender so we can call it after render.
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  // Split the full message path into topic and field parts.
  // For example, "/lexus3/vehicle_status.twist.angular.z" becomes:
  //    topicName: "/lexus3/vehicle_status"
  //    fieldPath: "twist.angular.z"
  const pathParts = config.series.messagePath.split('.');
  const topicName = pathParts[0] || "";
  const fieldPath = pathParts.slice(1).join('.');

  useLayoutEffect(() => {
    // Set up the onRender callback.
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      console.log("RenderState:", renderState);
      if (renderState.currentFrame) {
        for (const msgEvent of renderState.currentFrame) {
          console.log("Received message event:", msgEvent);
          if (msgEvent.topic === topicName) {
            // Use the fieldPath to extract the nested value, or fall back to .data.
            const value = fieldPath
              ? getNestedValue(msgEvent.message, fieldPath)
              : (msgEvent.message as any)?.data;
            if (typeof value === "number") {
              setAngle(value * parseFloat(config.series.scalingFactor));
              break;
            }
          }
        }
      }
    };

    context.subscribe([{ topic: topicName }]);
    context.watch("currentFrame");
  }, [context, topicName, fieldPath, config.series.scalingFactor]);

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
        <g transform={`rotate(${angle}, 100, 100)`}>
            <circle
              cx="100"
              cy="100"
              r="85"
              stroke="#524994"
              stroke-width="15"
              fill="none"
          />
          <circle
              cx="100"
              cy="100"
              r="60"
              stroke="#524994"
              stroke-width="2"
              fill="#524994"
          />
          <line x1="100" y1="100" x2="100" y2="180" stroke="#524994" stroke-width="15" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="#524994" stroke-width="15" />
        </g>
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${config.general.fontSize}px`,
            fill: "white",
            stroke: "#524994",
            strokeWidth: "1",
            fontWeight: "bold"
          }}
        >
          {config.general.title ? `${config.general.title}: ` : ""}
          {(parseFloat(angle.toFixed(config.general.precision))*parseFloat(config.series.numberScalingFactor)).toFixed(config.general.precision)}
          {config.series.unit === "deg" ? "°" : " rad"}
        </text>
      </svg> 
     
      {/* <svg width="100%" height="100%" viewBox="0 0 250 250" style={{overflow: "visible"}}>
        <g transform={`rotate(${angle}, 125, 125)`}>
        <path d="M124.75,0C55.8525,0,0,55.8525,0,124.75s55.8525,124.75,124.75,124.75,124.75-55.8525,124.75-124.75S193.6475,0,124.75,0ZM124.75,15.2472c54.0964,0,99.0246,39.2293,107.9037,90.7903h-28.2767c-8.4621-36.1478-40.8996-63.0681-79.627-63.0681s-71.165,26.9203-79.627,63.0681h-28.2767C25.7254,54.4765,70.6536,15.2472,124.75,15.2472ZM16.6167,142.0764h28.1981c6.6938,31.0265,30.9874,55.5024,61.9157,62.4579v28.2342c-46.2696-7.6618-82.7423-44.3252-90.1139-90.6921ZM142.7694,232.7685v-28.2342c30.9283-6.9555,55.2219-31.4314,61.9157-62.4579h28.1981c-7.3716,46.367-43.8443,83.0304-90.1139,90.6921Z"
          fill="#FFFFFF25" fill-rule="evenodd" stroke="#524994" stroke-width="5"
          />
     </g>
        <text
          x="125"
          y="125"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${config.general.fontSize}px`,
            fill: "white",
            stroke: "#524994",
            strokeWidth: "2",
            fontWeight: "bold"
          }}
        >
          {config.general.title ? `${config.general.title}: ` : ""}
          {angle.toFixed(config.general.precision)}
          {config.series.unit === "deg" ? "°" : " rad"}
        </text>
      </svg> */}
      
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
      messagePath: "",
      unit: "deg",
      scalingFactor: "1.0",
      numberScalingFactor: "1.0",
    },
  };

  // Attempt to load stored config from localStorage.
  const storedConfig = localStorage.getItem('foxglove-wheel-config');
  const persisted: Partial<SteeringWheelPanelConfig> = storedConfig
    ? JSON.parse(storedConfig)
    : (myContext.config as Partial<SteeringWheelPanelConfig> || {});
    
  const config: SteeringWheelPanelConfig = {
    general: {
      ...defaultConfig.general,
      ...persisted.general,
    },
    series: {
      ...defaultConfig.series,
      ...persisted.series,
    },
  };

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
    // Save updated config to localStorage.
    localStorage.setItem('foxglove-wheel-config', JSON.stringify(updatedConfig));
    // Render updated panel.
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
            numberScalingFactor: {
              label: "Number Scaling Factor",
              input: "string" as const,
              value: currentConfig.series.numberScalingFactor,
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
