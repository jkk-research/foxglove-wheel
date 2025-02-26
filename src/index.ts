// index.ts
import { ExtensionContext } from "@foxglove/extension";
import { initSteeringWheelPanel } from "./SteeringWheelPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Steering Wheel",
    initPanel: initSteeringWheelPanel,
  });
}
