// 보류 중인 반복 입력은 해제·취소·화면 이탈 때 항상 정리합니다.
export function createHoldRepeater({ setTimeout: wait = setTimeout, clearTimeout: cancel = clearTimeout } = {}) {
  let timer = null;
  let generation = 0;
  function stop() {
    generation++;
    if (timer !== null) cancel(timer);
    timer = null;
  }
  function start(action) {
    stop();
    const token = generation;
    const repeat = () => {
      if (token !== generation) return;
      action();
      if (token === generation) timer = wait(repeat, 85);
    };
    action();
    if (token === generation) timer = wait(repeat, 240);
  }
  return { start, stop };
}
