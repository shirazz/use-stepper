/* eslint-disable react/prop-types, import/no-extraneous-dependencies */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { renderHook, act } from 'react-hooks-testing-library';
import useStepper from './use-stepper';

function Counter(props) {
  const {
    setValue,
    getFormProps,
    getInputProps,
    getIncrementProps,
    getDecrementProps,
  } = useStepper(props);

  return (
    <form data-testid="form" {...getFormProps()}>
      <button data-testid="decrement" type="button" {...getDecrementProps()}>
        decrement
      </button>
      <input data-testid="input" {...getInputProps()} />
      <button data-testid="increment" type="button" {...getIncrementProps()}>
        increment
      </button>
      <button
        data-testid="set-value-to-42"
        type="button"
        onClick={() => setValue(42)}
      >
        set value to 42
      </button>
    </form>
  );
}

function renderForm(options = {}) {
  const renderResult = render(<Counter {...options} />);
  const { value } = renderResult.getByTestId('input');
  return { value, ...renderResult };
}

describe('useStepper', () => {
  it('exports a function', () => {
    expect(useStepper).toBeInstanceOf(Function);
  });

  it('returns a value even when no options are specified', () => {
    const { result } = renderHook(() => useStepper());
    expect(Number.isNaN(parseFloat(result.current.value))).toBeFalsy();
  });

  it('honors the defaultValue parameter', () => {
    const { result } = renderHook(() => useStepper({ defaultValue: 42 }));
    expect(result.current.value).toBe('42');
  });

  it('returns the correct properties', () => {
    const { result } = renderHook(() => useStepper());
    expect(result.current).toMatchSnapshot();
  });

  it('provides the correct form props in getFormProps', () => {
    const { result } = renderHook(() => useStepper());
    expect(result.current.getFormProps()).toMatchSnapshot();
  });

  it('provides the correct input props in getInputProps', () => {
    const { result } = renderHook(() => useStepper());
    expect(result.current.getInputProps()).toMatchSnapshot();
  });

  it('provides the correct decrement props in getDecrementProps', () => {
    const { result } = renderHook(() => useStepper());
    expect(result.current.getDecrementProps()).toMatchSnapshot();
  });

  it('provides the correct increment props in getIncrementProps', () => {
    const { result } = renderHook(() => useStepper());
    expect(result.current.getIncrementProps()).toMatchSnapshot();
  });

  it('constrains setValue calls to min and max', () => {
    const { result } = renderHook(() =>
      useStepper({
        min: 1,
        max: 2,
        defaultValue: 1,
      }),
    );

    expect(result.current.value).toBe('1');
    act(() => result.current.setValue(2));
    expect(result.current.value).toBe('2');
    act(() => result.current.setValue(3));
    expect(result.current.value).toBe('2');
  });

  it('constrains increment/decrement to min and max', () => {
    const { result } = renderHook(() =>
      useStepper({
        min: 1,
        max: 2,
        defaultValue: 1,
      }),
    );

    expect(result.current.value).toBe('1');
    act(() => result.current.decrement());
    expect(result.current.value).toBe('1');
    act(() => result.current.increment());
    expect(result.current.value).toBe('2');
    act(() => result.current.increment());
    expect(result.current.value).toBe('2');
  });

  it('selects input value on focus', () => {
    const { getByTestId } = renderForm();
    const input = getByTestId('input');

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(0);

    fireEvent.focus(input);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('updates current value on blur', () => {
    const min = 1;
    const max = 10;
    const defaultValue = 5;
    const { getByTestId } = renderForm({ defaultValue, min, max });
    const input = getByTestId('input');

    expect(input.value).toBe(String(defaultValue));

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: max + 1 } });
    fireEvent.blur(input);

    expect(input.value).toBe(String(max));

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: min - 1 } });
    fireEvent.blur(input);

    expect(input.value).toBe(String(min));

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '-' } });
    fireEvent.blur(input);

    expect(input.value).toBe(String(defaultValue));
  });

  it('blurs input on submit', () => {
    const { getByTestId } = renderForm();
    const input = getByTestId('input');
    const form = getByTestId('form');

    input.focus();
    expect(input).toHaveFocus();

    fireEvent.submit(form);

    expect(input).not.toHaveFocus();
  });

  it('handles decimals', () => {
    const { result } = renderHook(() =>
      useStepper({ defaultValue: 1, step: 0.25 }),
    );

    expect(result.current.value).toBe('1');
    act(() => result.current.decrement());
    expect(result.current.value).toBe('0.75');
    act(() => result.current.increment());
    act(() => result.current.increment());
    expect(result.current.value).toBe('1.25');
    act(() => result.current.setValue('-0.5'));
    expect(result.current.value).toBe('-0.5');
    act(() => result.current.decrement());
    expect(result.current.value).toBe('-0.75');
  });

  it('accepts a custom reducer', () => {
    const cents = str => str.split('.').length === 2;
    const dollars = str => str.split('.')[0];
    const getPreviousEvenDollar = value => {
      const str = String(value);
      return cents(str) ? dollars(str) : dollars(String(value - 1));
    };
    const getNextEvenDollar = value => dollars(String(value + 1));

    function dollarReducer(state, action) {
      const currentNumericValue = parseFloat(state.value);
      switch (action.type) {
        case useStepper.actionTypes.increment: {
          const newValue = parseInt(getNextEvenDollar(currentNumericValue), 10);
          if (newValue !== currentNumericValue) {
            return { ...state, value: String(newValue) };
          }
          return state;
        }
        case useStepper.actionTypes.decrement: {
          const newValue = parseInt(
            getPreviousEvenDollar(currentNumericValue),
            10,
          );
          if (newValue !== currentNumericValue) {
            return { ...state, value: String(newValue) };
          }
          return state;
        }
        case useStepper.actionTypes.coerce: {
          return state;
        }
        case useStepper.actionTypes.setValue: {
          if (action.payload !== undefined && action.payload !== state.value) {
            return { value: String(action.payload) };
          }
          return state;
        }
        default:
          return useStepper.defaultReducer(state, action);
      }
    }

    const { result } = renderHook(() =>
      useStepper({ stateReducer: dollarReducer }),
    );

    act(() => result.current.setValue('4.25'));
    expect(result.current.value).toBe('4.25');
    act(() => result.current.increment());
    expect(result.current.value).toBe('5');

    act(() => result.current.setValue('0.25'));
    expect(result.current.value).toBe('0.25');
    act(() => result.current.decrement());
    expect(result.current.value).toBe('0');
  });

  describe('enableReinitialize', () => {
    it('true: value is updated to new default if defaultValue changes and value has not been modified', () => {
      const { result, rerender } = renderHook(opts => useStepper(opts), {
        initialProps: { enableReinitialize: true, defaultValue: 33 },
      });

      expect(result.current.value).toBe('33');
      rerender({ enableReinitialize: true, defaultValue: 42 });
      expect(result.current.value).toBe('42');
    });

    it('true: value is not updated to new default if defaultValue changes and value has been modified', () => {
      const { result, rerender } = renderHook(opts => useStepper(opts), {
        initialProps: { enableReinitialize: true, defaultValue: 33 },
      });

      expect(result.current.value).toBe('33');
      act(() => result.current.increment());
      expect(result.current.value).toBe('34');
      rerender({ enableReinitialize: true, defaultValue: 42 });
      expect(result.current.value).toBe('34');
    });

    it('false: value remains unchanged if defaultValue changes', () => {
      const { result, rerender } = renderHook(opts => useStepper(opts), {
        initialProps: { defaultValue: 33 },
      });

      expect(result.current.value).toBe('33');
      rerender({ defaultValue: 42 });
      expect(result.current.value).toBe('33');
    });
  });
});
