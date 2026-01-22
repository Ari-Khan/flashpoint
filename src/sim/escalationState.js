export function createEscalationState() {
  return {
    time: 0,
    involved: new Set(),
    destroyed: new Set(),
    events: [],
    remaining: {},
    struck: new Set()
  };
}
