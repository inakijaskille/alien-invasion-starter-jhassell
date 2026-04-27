export default class StateManager {
  constructor() {
    this.state = 'start';
  }
  set(state) { this.state = state; }
  is(s) { return this.state === s; }
}
