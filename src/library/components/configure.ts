import type { ControlSpecification } from '../../controls/types';
import type { CompositionOverlay } from '../../visuals/types';
import { defaultConfiguration, setParameter, type ControlConfiguration } from '../state';
import { el, button } from '../dom';

export function configuredOverlays(control: ControlSpecification, configuration: ControlConfiguration): readonly CompositionOverlay[] {
  const values = configuration.parameters;
  if (control.id === 'symmetrical') return [{ type: 'symmetry-axis', axis: values.axis === 'horizontal' ? 'horizontal' : 'vertical' }];
  if (control.id === 'rule-of-thirds') {
    const point = String(values.intersection);
    return [{ type: 'thirds-grid' }, { type: 'subject-position', x: point.endsWith('right') ? 2 / 3 : 1 / 3, y: point.startsWith('lower') ? 2 / 3 : 1 / 3 }];
  }
  if (control.id === 'negative-space') {
    const area = Number(values['area-fraction']);
    const side = String(values.side);
    const horizontal = side === 'left' || side === 'right';
    return [{ type: 'negative-space', x: side === 'right' ? 1 - area : 0, y: side === 'bottom' ? 1 - area : 0, width: horizontal ? area : 1, height: horizontal ? 1 : area }];
  }
  return control.visualPreview.overlays;
}

export function configurationPanel(control: ControlSpecification, state: ControlConfiguration, onChange: () => void): HTMLElement {
  const form = el('form', 'configuration-form');
  form.addEventListener('submit', event => event.preventDefault());
  const fields = el('div', 'parameter-fields');
  const inputs: Array<{ reset: () => void }> = [];
  for (const parameter of control.parameters) {
    const field = el('div', 'parameter-field');
    const label = el('label', '', parameter.name); label.htmlFor = `parameter-${parameter.id}`;
    const description = el('p', 'field-description', parameter.description); description.id = `help-${parameter.id}`;
    let input: HTMLInputElement | HTMLSelectElement;
    if (parameter.kind === 'choice') {
      const select = el('select');
      parameter.options.forEach(option => { const item = el('option', '', option.replaceAll('-', ' ')); item.value = option; select.append(item); });
      select.value = String(state.parameters[parameter.id]); input = select;
      select.addEventListener('change', () => { setParameter(control, state, parameter.id, select.value); onChange(); });
      inputs.push({ reset: () => { select.value = String(state.parameters[parameter.id]); } });
    } else if (parameter.kind === 'boolean') {
      const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = Boolean(state.parameters[parameter.id]); input = checkbox;
      checkbox.addEventListener('change', () => { setParameter(control, state, parameter.id, checkbox.checked); onChange(); });
      inputs.push({ reset: () => { checkbox.checked = Boolean(state.parameters[parameter.id]); } });
    } else {
      const slider = el('input'); slider.type = 'range'; slider.min = String(parameter.min); slider.max = String(parameter.max);
      slider.step = parameter.unit === 'frame fraction' ? '0.01' : parameter.min % 1 !== 0 ? '0.1' : '1';
      slider.value = String(state.parameters[parameter.id]); input = slider;
      const output = el('output', 'parameter-value', `${slider.value} ${parameter.unit}`); output.htmlFor = `parameter-${parameter.id}`;
      field.append(output);
      slider.addEventListener('input', () => { setParameter(control, state, parameter.id, Number(slider.value)); output.value = `${slider.value} ${parameter.unit}`; onChange(); });
      inputs.push({ reset: () => { slider.value = String(state.parameters[parameter.id]); output.value = `${slider.value} ${parameter.unit}`; } });
    }
    input.id = `parameter-${parameter.id}`; input.setAttribute('aria-describedby', description.id);
    field.prepend(label); field.append(input, description); fields.append(field);
  }
  form.append(fields, button('Reset configuration', () => {
    Object.assign(state.parameters, defaultConfiguration(control).parameters);
    inputs.forEach(input => input.reset()); onChange();
  }, 'text-button'));
  return form;
}
