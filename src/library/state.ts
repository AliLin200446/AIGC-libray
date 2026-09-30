import type { ControlId, ControlSpecification, ParameterValue } from '../controls/types';

export interface ControlConfiguration {
  controlId: ControlId;
  controlRevision: number;
  parameters: Record<string, ParameterValue>;
}
export function defaultConfiguration(control: ControlSpecification): ControlConfiguration {
  return { controlId: control.id, controlRevision: control.revision, parameters: Object.fromEntries(control.parameters.map(parameter => [parameter.id, parameter.defaultValue])) };
}
export function setParameter(control: ControlSpecification, configuration: ControlConfiguration, id: string, value: ParameterValue): void {
  const parameter = control.parameters.find(item => item.id === id);
  if (!parameter || configuration.controlId !== control.id) throw new Error('Unknown control parameter.');
  const valid = parameter.kind === 'boolean' ? typeof value === 'boolean'
    : parameter.kind === 'choice' ? typeof value === 'string' && parameter.options.includes(value)
      : typeof value === 'number' && Number.isFinite(value) && value >= parameter.min && value <= parameter.max;
  if (!valid) throw new Error(`Invalid value for ${parameter.name}.`);
  configuration.parameters[id] = value;
}
