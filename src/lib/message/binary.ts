import { UnreachableCaseError } from 'ts-essentials';

export enum ValueType {
  Integer = 'int',
  Float = 'float',
  Double = 'double',
  Boolean = 'boolean',
  Raw = 'raw',
  Rpc = 'rpc',
  String = 'string',
  BooleanArray = 'boolean[]',
  IntegerArray = 'int[]',
  FloatArray = 'float[]',
  DoubleArray = 'double[]',
  StringArray = 'string[]',
}

// string | number | boolean | Uint8Array | boolean[] | number[] | string[]

export type Value =
  | { type: ValueType.Integer; value: number }
  | { type: ValueType.Float; value: number }
  | { type: ValueType.Double; value: number }
  | { type: ValueType.Boolean; value: boolean }
  | { type: ValueType.Raw; value: Uint8Array }
  | { type: ValueType.Rpc; value: Uint8Array }
  | { type: ValueType.String; value: string }
  | { type: ValueType.BooleanArray; value: boolean[] }
  | { type: ValueType.IntegerArray; value: number[] }
  | { type: ValueType.FloatArray; value: number[] }
  | { type: ValueType.DoubleArray; value: number[] }
  | { type: ValueType.StringArray; value: string[] };

export type BinaryMessage = Value & {
  timestamp: number;
};

export function defaultValue<T extends ValueType>(
  type: T
): Extract<Value, { type: T }>;
export function defaultValue(type: ValueType): Value {
  switch (type) {
    case ValueType.Integer:
    case ValueType.Float:
    case ValueType.Double:
      return { type, value: 0 };
    case ValueType.Boolean:
      return { type, value: false };
    case ValueType.Raw:
    case ValueType.Rpc:
      return { type, value: Uint8Array.of() };
    case ValueType.String:
      return { type, value: '' };
    case ValueType.BooleanArray:
    case ValueType.IntegerArray:
    case ValueType.FloatArray:
    case ValueType.DoubleArray:
    case ValueType.StringArray:
      return { type, value: [] };
    default:
      throw new UnreachableCaseError(type);
  }
}

function a(type:ValueType) {
  const z = defaultValue(type).value;
  z
}
