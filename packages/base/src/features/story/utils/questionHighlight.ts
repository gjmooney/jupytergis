export interface IQuestionFeatureRef {
  layerId: string;
  property: string;
  value: string;
}

export function featureMatchesQuestionRef(
  properties: Record<string, unknown>,
  property: string,
  value: string,
): boolean {
  const raw = properties[property];
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return false;
  }

  return String(raw).trim() === value.trim();
}
