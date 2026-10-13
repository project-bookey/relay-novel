// 열매 하나가 떨어져 땅에 부딪히고, 옆으로 튕겨 나가 굴러가다 멈추기까지의 길을 계산한다.
// React·Expo 의존성이 없어서 node 테스트가 가능하다. 길이는 화면 픽셀, 시간은 초 단위다.

export interface FruitPathInput {
  // 떨어지기 시작하는 높이(땅에서부터)
  fallHeight: number;
  // 열매 그림 한 변의 길이
  size: number;
  // 둥근 열매는 굴러가고, 모난 열매는 미끄러지다 선다.
  rollsLikeBall: boolean;
  // 튕겨 나가는 방향(1: 오른쪽, -1: 왼쪽)
  direction: 1 | -1;
  // 중력 가속도(픽셀/초²). 멀리 있는 열매일수록 작게 준다.
  gravity: number;
  // 둥근 열매가 다 굴러간 뒤 기울어진 채 멈추는 각도(도)
  restTilt: number;
}

export interface FruitPath {
  durationMs: number;
  // 처음 땅에 부딪히는 순간(전체 진행률 0~1)
  landingAt: number;
  // 아래 값들이 해당하는 진행률(0에서 1까지 늘어난다)
  times: number[];
  // 멈출 자리에서 가로로 떨어진 거리(마지막은 0)
  offsetX: number[];
  // 땅에서 떠 있는 높이(마지막은 0)
  height: number[];
  // 기울어진 각도(도)
  angle: number[];
}

interface Material {
  // 땅에 부딪힌 뒤 남는 세로 속도의 비율. 클수록 높이 튕긴다.
  restitution: number;
  // 땅에 부딪힐 때마다 남는 가로 속도의 비율
  grip: number;
  // 마지막에 구르거나 미끄러지다 멈추기까지 걸리는 시간
  settleSeconds: number;
}

const BALL: Material = { restitution: 0.38, grip: 0.85, settleSeconds: 0.4 };
const BLOCK: Material = { restitution: 0.28, grip: 0.6, settleSeconds: 0.22 };

// 둥근 열매 몸통의 반지름(그림 크기에 대한 비율). 구른 거리 ÷ 반지름 = 돈 각도.
export const BALL_RADIUS_RATIO = 13 / 40;
// 모난 열매가 튕겨 오를 때마다 공중에서 기우뚱하는 최대 각도
const BLOCK_TUMBLE_DEGREES = [24, 9, 3];
const MIN_BOUNCE_HEIGHT = 1.5;
const MAX_BOUNCES = 3;
const SAMPLE_SECONDS = 1 / 60;

interface Sample {
  time: number;
  traveled: number;
  height: number;
  angle: number;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

// 처음 부딪힌 곳에서 멈출 곳까지 옆으로 움직이는 거리.
// 둥근 열매는 한 바퀴 굴러간 다음 restTilt만큼 더 돌아 기울어진 채 멈춘다.
function travelDistance(input: FruitPathInput) {
  if (!input.rollsLikeBall) return input.size;
  const radius = input.size * BALL_RADIUS_RATIO;
  const turn = 2 * Math.PI + (input.restTilt * Math.PI) / 180;
  return radius * turn;
}

export function planFruitPath(input: FruitPathInput): FruitPath {
  const material = input.rollsLikeBall ? BALL : BLOCK;
  const gravity = input.gravity;
  const fallSeconds = Math.sqrt((2 * input.fallHeight) / gravity);

  // 부딪힐 때마다 세로 속도가 restitution만큼 줄어, 점점 낮고 짧게 튕긴다.
  const bounces: { airSeconds: number }[] = [];
  let verticalSpeed = gravity * fallSeconds * material.restitution;
  while (bounces.length < MAX_BOUNCES) {
    const peak = (verticalSpeed * verticalSpeed) / (2 * gravity);
    if (peak < MIN_BOUNCE_HEIGHT) break;
    bounces.push({ airSeconds: (2 * verticalSpeed) / gravity });
    verticalSpeed *= material.restitution;
  }

  // 정해진 거리만큼 가도록 첫 가로 속도를 거꾸로 구한다.
  // 튕길 때마다 grip만큼 느려지고, 마지막에는 일정하게 느려지며 멈춘다.
  const travel = travelDistance(input);
  const bounceWeight = bounces.reduce(
    (sum, bounce, index) =>
      sum + Math.pow(material.grip, index) * bounce.airSeconds,
    0,
  );
  const settleStartFactor = Math.pow(material.grip, bounces.length);
  const settleWeight = (settleStartFactor * material.settleSeconds) / 2;
  const firstSpeed = travel / (bounceWeight + settleWeight);
  const radius = input.size * BALL_RADIUS_RATIO;

  const samples: Sample[] = [];
  let elapsed = 0;
  let traveledBefore = 0;
  const addSegment = (
    seconds: number,
    sampleAt: (localSeconds: number) => Omit<Sample, "time">,
  ) => {
    const steps = Math.max(2, Math.ceil(seconds / SAMPLE_SECONDS));
    // 앞 구간의 끝과 겹치지 않도록 두 번째 구간부터는 처음 점을 건너뛴다.
    const firstStep = samples.length === 0 ? 0 : 1;
    for (let step = firstStep; step <= steps; step++) {
      const localSeconds = (seconds * step) / steps;
      samples.push({ time: elapsed + localSeconds, ...sampleAt(localSeconds) });
    }
    elapsed += seconds;
  };
  const rollingAngle = (traveled: number) =>
    input.direction * toDegrees(traveled / radius);

  // 1. 곧게 떨어진다.
  addSegment(fallSeconds, (seconds) => ({
    traveled: 0,
    height: Math.max(0, input.fallHeight - 0.5 * gravity * seconds * seconds),
    angle: 0,
  }));

  // 2. 부딪힐 때마다 옆으로 튕겨 나간다.
  bounces.forEach((bounce, index) => {
    const upwardSpeed = (gravity * bounce.airSeconds) / 2;
    const sideSpeed = firstSpeed * Math.pow(material.grip, index);
    const start = traveledBefore;
    addSegment(bounce.airSeconds, (seconds) => {
      const traveled = start + sideSpeed * seconds;
      const tumble =
        input.direction *
        (BLOCK_TUMBLE_DEGREES[index] ?? 0) *
        Math.sin((Math.PI * seconds) / bounce.airSeconds);
      return {
        traveled,
        height: Math.max(
          0,
          upwardSpeed * seconds - 0.5 * gravity * seconds * seconds,
        ),
        angle: input.rollsLikeBall ? rollingAngle(traveled) : tumble,
      };
    });
    traveledBefore += sideSpeed * bounce.airSeconds;
  });

  // 3. 땅에서 구르거나 미끄러지다 멈춘다.
  const settleSpeed = firstSpeed * settleStartFactor;
  const settleStart = traveledBefore;
  addSegment(material.settleSeconds, (seconds) => {
    const traveled =
      settleStart +
      settleSpeed * seconds -
      (0.5 * settleSpeed * seconds * seconds) / material.settleSeconds;
    return {
      traveled,
      height: 0,
      angle: input.rollsLikeBall ? rollingAngle(traveled) : 0,
    };
  });

  const totalTraveled = samples[samples.length - 1].traveled;
  const times = samples.map((sample) => sample.time / elapsed);
  // 더한 시간이 부동소수 오차로 1을 살짝 넘지 않도록 끝을 정확히 맞춘다.
  times[times.length - 1] = 1;
  return {
    durationMs: elapsed * 1000,
    landingAt: fallSeconds / elapsed,
    times,
    offsetX: samples.map(
      (sample) => input.direction * (sample.traveled - totalTraveled),
    ),
    height: samples.map((sample) => sample.height),
    angle: samples.map((sample) => sample.angle),
  };
}
