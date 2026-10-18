// 열매가 하늘에서 떨어져 땅에 부딪혀 튕기고, 구르거나 미끄러져 제자리에 멈추기까지의 움직임을 계산한다.
// 움직임은 땅 위 세상(좌우·앞뒤·높이)에서 계산하고 원근에 맞춰 화면으로 옮긴다.
// 그래서 앞뒤로 움직이면 크기가 따라 바뀌고, 그림자는 늘 열매 바로 아래 땅에 진다.
// React·Expo 의존성이 없어서 node 테스트가 가능하다.
// 길이는 원근 배율 1인 곳의 화면 픽셀, 시간은 초 단위다.

// 땅을 비스듬히 내려다보는 눈. 땅 위의 점은 멀수록 지평선 쪽(화면 위)으로 모이고 작아진다.
export interface GroundView {
  // 화면 가운데 x
  centerX: number;
  // 지평선의 화면 y. 땅을 내려다보므로 보통 화면 위 바깥에 있다.
  horizonY: number;
  // 눈높이. 원근 배율 1인 땅이 지평선보다 이만큼 아래에 보인다.
  eyeHeight: number;
}

// 땅 위 세상의 한 점. 좌우(side)는 원근 배율 1에서의 화면 픽셀, 앞뒤(distance)는 눈에서 떨어진 거리다.
export interface WorldPoint {
  side: number;
  distance: number;
  height: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

// 열매 그림을 내려다보는 각도(약 33°)에 맞춘, 눈높이 ÷ 원근 배율 1인 땅까지의 거리
const LOOK_DOWN_SLOPE = 0.65;

function referenceDistance(view: GroundView) {
  return view.eyeHeight / LOOK_DOWN_SLOPE;
}

// 화면 y가 다른 땅 위의 두 점과 각 점의 원근 배율로 눈을 정한다.
export function groundViewThrough(
  centerX: number,
  far: { y: number; depth: number },
  near: { y: number; depth: number },
): GroundView {
  const eyeHeight = (near.y - far.y) / (near.depth - far.depth);
  return { centerX, horizonY: near.y - eyeHeight * near.depth, eyeHeight };
}

export function toScreen(view: GroundView, point: WorldPoint) {
  const depth = referenceDistance(view) / point.distance;
  return {
    x: view.centerX + point.side * depth,
    y: view.horizonY + (view.eyeHeight - point.height) * depth,
    depth,
  };
}

// 화면의 한 점을, 원근 배율이 depth인 곳에 떠 있는 세상의 점으로 되돌린다.
// depth를 주지 않으면 땅 위의 점으로 본다.
export function toWorld(
  view: GroundView,
  screen: ScreenPoint,
  depth = (screen.y - view.horizonY) / view.eyeHeight,
): WorldPoint {
  return {
    side: (screen.x - view.centerX) / depth,
    distance: referenceDistance(view) / depth,
    height: view.eyeHeight - (screen.y - view.horizonY) / depth,
  };
}

// 땅에 부딪힌 뒤 튀어 나가 굴러가는 거리. 옆(side)과 보는 사람 쪽(toward)으로 나눈다.
export interface RollAway {
  side: number;
  toward: number;
}

// 하늘에서 떨어지기 시작하는 자리. 멈출 자리에서 굴러올 만큼(rollAway) 거슬러 간 땅의 바로 위 하늘이라,
// 거의 곧게 떨어져 땅에 부딪힌 뒤 굴러서 멈출 자리에 닿는다.
// 열매 바닥이 화면 위 가장자리 바깥(entryY)에 오는 높이라서, 화면에 갑자기 나타나지 않고 화면 밖에서 들어온다.
export function skyStart(
  view: GroundView,
  rest: WorldPoint,
  rollAway: RollAway,
  entryY: number,
): WorldPoint {
  const distance = rest.distance + rollAway.toward;
  const depth = referenceDistance(view) / distance;
  return {
    side: rest.side - rollAway.side,
    distance,
    height: view.eyeHeight - (entryY - view.horizonY) / depth,
  };
}

// 떨어지는 느낌을 정하는 값들. 시안마다 다르다.
export interface FlightStyle {
  // 중력 가속도(px/초²)
  gravity: number;
  // 땅에 부딪힌 뒤 남는 세로 속도의 비율. 클수록 높이 튕긴다.
  restitution: number;
  maxBounces: number;
  // 처음 부딪힐 때 남는 가로 빠르기의 비율. 그 뒤로는 땅에서 일정하게 느려지며 멈춘다.
  kick: number;
  // 마지막으로 튄 뒤 구르거나 미끄러지다 멈추기까지 걸리는 시간
  settleSeconds: number;
  // 처음 부딪힐 때 납작해지는 정도(0~1)와, 그 뒤 말랑하게 출렁이다 잦아드는 시간
  squash: number;
  squashFadeSeconds: number;
  // 빠르게 떨어질 때 길쭉해지는 정도(0~1)
  stretch: number;
  // 모난 열매가 튕겨 오를 때 공중에서 기우뚱하는 각도
  tumbleDegrees: number;
}

export interface FlightInput {
  // 떨어지기 시작하는 하늘의 자리와 멈출 땅 위의 자리(열매 바닥)
  start: WorldPoint;
  rest: WorldPoint;
  view: GroundView;
  // 원근 배율 1에서 열매 그림 한 변의 길이
  size: number;
  // 둥근 열매는 굴러가고, 모난 열매는 미끄러지다 선다.
  rollsLikeBall: boolean;
  // 둥근 열매가 다 굴러간 뒤 기울어진 채 멈추는 각도(도)
  restTilt: number;
  style: FlightStyle;
}

export interface FruitFlight {
  durationMs: number;
  // 처음 땅에 부딪히는 순간(전체 진행률 0~1)
  landingAt: number;
  // 아래 값들이 해당하는 진행률(0에서 1까지 늘어난다)
  times: number[];
  // 멈출 자리에서 열매 바닥이 떨어진 화면 거리(마지막은 0)
  offsetX: number[];
  offsetY: number[];
  // 멈출 자리의 원근 배율에 대한 지금 원근 배율. 멀리 있을수록 작다.
  nearness: number[];
  // 그림자는 열매 바로 아래 땅에 진다. 멈출 자리에서 떨어진 화면 거리와 크기·진하기
  shadowOffsetY: number[];
  shadowScale: number[];
  shadowOpacity: number[];
  // 몸통이 구르거나 기우뚱한 각도(도)
  angle: number[];
  // 납작해지거나 길쭉해진 비율(1이면 그대로)
  stretchX: number[];
  stretchY: number[];
}

// 둥근 열매 몸통의 반지름(그림 크기에 대한 비율). 구른 거리 ÷ 반지름 = 돈 각도.
export const BALL_RADIUS_RATIO = 13 / 40;
const MIN_BOUNCE_HEIGHT = 1.5;
const SAMPLE_SECONDS = 1 / 60;
// 부딪힌 뒤 출렁이는 한 주기. 납작 → 길쭉 → 납작으로 잦아든다.
const SQUASH_PERIOD = 0.18;

interface Sample {
  time: number;
  traveled: number;
  height: number;
  // 위로 향하는 세로 속도(떠 있을 때만)
  climb: number;
  airborne: boolean;
  tumble: number;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

interface GroundPoint {
  x: number;
  y: number;
  depth: number;
}

// 땅에 닿기 전 떨어지는 동안 미리 돌 때 가장 빠른 빠르기(도/초, 1/60초에 9°).
// 하늘에서 떨어지는 열매는 이 안에서 다 맞추고, 손으로 낮게 놓을 때처럼 떨어지는 시간이 짧아도 휙 돌지 않는다.
export const MAX_PRE_SPIN = 540;

// 0에서 1로 천천히 늘었다가 천천히 다다르는 값. 가운데에서 가장 빨라 평균의 1.5배다.
function smoothstep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

// 화면에서 굴러가는 쪽(오른쪽이면 1, 시계 방향). 화면 x가 거의 그대로인 앞뒤 움직임이면 땅 위 방향(side)으로 정한다.
// side가 -0처럼 0에 가까운 계산 잡음이어도 화면에서 가는 쪽과 반대로 돌지 않게 한다.
export function rollDirectionOf(screenDx: number, side: number) {
  if (Math.abs(screenDx) > 0.5) return Math.sign(screenDx);
  return side < 0 ? -1 : 1;
}

// 둥근 열매가 도는 각도(도, 굴러가는 쪽을 +로 잰 값).
// 처음 부딪힌 뒤로는 튕겨 떠 있을 때든 땅에서 구를 때든 화면에서 굴러간 거리 ÷ 그때의 반지름만큼 돌아,
// 미끄러지거나 헛돌지 않는다. 다 굴러가면 꼭지가 restTilt만큼 기운 채(한 바퀴씩 더 돈 것은 상관없이) 멈추도록,
// 모자라거나 남는 만큼은 땅에 닿기 전 떨어지는 동안 천천히 돌기 시작해 천천히 멈추며 미리 돈다(떨어지는 동안은
// 굴러가는 땅이 없어 어색하지 않다). 떨어지는 시간이 짧아 MAX_PRE_SPIN을 넘는 몫만 땅에 닿은 뒤 회전에 고르게 나눈다.
function ballTurns(
  samples: Sample[],
  grounds: GroundPoint[],
  landingIndex: number,
  size: number,
  restTilt: number,
) {
  // 구간마다 화면에서 굴러간 각도. 처음 부딪히기 전(떨어지는 동안)은 0이다.
  const rolledSteps = samples.map((_, index) => {
    if (index <= landingIndex) return 0;
    const before = grounds[index - 1];
    const after = grounds[index];
    const radius =
      size * BALL_RADIUS_RATIO * ((before.depth + after.depth) / 2);
    return toDegrees(
      Math.hypot(after.x - before.x, after.y - before.y) / radius,
    );
  });
  const rolled = rolledSteps.reduce((sum, step) => sum + step, 0);
  // 굴러가지 않으면 기울지도 않는다.
  if (rolled === 0) return samples.map(() => 0);
  const fullTurns = Math.max(0, Math.round((rolled - restTilt) / 360));
  const target = fullTurns * 360 + restTilt;
  const fallSeconds = samples[landingIndex].time - samples[0].time;
  // 떨어지는 동안 미리 도는 몫. 가장 빠를 때가 평균의 1.5배이므로 그만큼 나눠 상한을 지킨다.
  // 높이 없이 내려놓으면 떨어지는 시간이 없어 미리 돌지 않는다.
  const preLimit = (MAX_PRE_SPIN * fallSeconds) / 1.5;
  const preTurn = Math.min(preLimit, Math.max(-preLimit, target - rolled));
  // 미리 돌고도 남는 몫은 땅에 닿은 뒤 굴러가는 회전을 그만큼 늘리거나 줄여 맞춘다(대개 1).
  const rollShare = (target - preTurn) / rolled;

  let turnedAfterLanding = 0;
  return samples.map((sample, index) => {
    if (index === samples.length - 1) return target;
    if (index <= landingIndex) {
      const fallen =
        fallSeconds > 0 ? (sample.time - samples[0].time) / fallSeconds : 1;
      return preTurn * smoothstep(fallen);
    }
    turnedAfterLanding += rolledSteps[index] * rollShare;
    return preTurn + turnedAfterLanding;
  });
}

// 떠 있는 높이에 따른 그림자의 크기 비율과 진하기. 땅에 닿아 있으면 그대로이고,
// 열매 세 개 높이 넘게 뜨면 땅에 닿는 점으로 작아지며 사라진다. size는 원근 배율 1에서의 열매 크기다.
export function shadowAt(height: number, size: number) {
  const closeness = 1 - Math.min(1, height / (size * 3));
  return { scale: 0.35 + 0.65 * closeness, opacity: closeness };
}

export function planFlight(input: FlightInput): FruitFlight {
  const { style, start, rest, view } = input;
  const gravity = style.gravity;

  // 땅에 닿을 때까지
  const impactSpeed = Math.sqrt(2 * gravity * start.height);
  const fallSeconds = impactSpeed / gravity;

  // 부딪힐 때마다 세로 속도가 restitution만큼 줄어, 점점 낮고 짧게 튕긴다.
  const bounceSpeeds: number[] = [];
  let launch = impactSpeed * style.restitution;
  while (bounceSpeeds.length < style.maxBounces) {
    if ((launch * launch) / (2 * gravity) < MIN_BOUNCE_HEIGHT) break;
    bounceSpeeds.push(launch);
    launch *= style.restitution;
  }
  const airSeconds = bounceSpeeds.map((speed) => (2 * speed) / gravity);

  // 땅 위에서 가는 길은 처음부터 끝까지 한 방향이다. 떨어지는 동안은 일정한 빠르기로 가다가,
  // 처음 부딪히면 kick배가 되고, 그 뒤 땅에서 일정하게 느려져 멈춘다.
  // 이 길이 정해진 자리에서 끝나도록 처음 빠르기를 거꾸로 구한다.
  const along = {
    side: rest.side - start.side,
    ahead: rest.distance - start.distance,
  };
  const travel = Math.hypot(along.side, along.ahead);
  const groundSeconds =
    airSeconds.reduce((sum, seconds) => sum + seconds, 0) + style.settleSeconds;
  const fallSpeed = travel / (fallSeconds + (style.kick * groundSeconds) / 2);
  const groundSpeed = fallSpeed * style.kick;
  const fallTravel = fallSpeed * fallSeconds;
  // 처음 부딪힌 뒤 seconds초 동안 땅 위에서 간 거리
  const traveledOnGround = (seconds: number) => {
    const moving = Math.min(seconds, groundSeconds);
    return (
      groundSpeed * moving -
      (groundSpeed * moving * moving) / (2 * groundSeconds)
    );
  };

  const samples: Sample[] = [];
  let elapsed = 0;
  // sampleAt은 구간 안의 시각과, 그 점이 구간의 끝(땅에 닿는 순간)인지를 받는다.
  // 끝인지는 시각을 견주지 않고 몇 번째 점인지로 정한다. 나눗셈 오차로 끝 점이 떠 있는 것으로 잘못 보지 않게 한다.
  const addSegment = (
    seconds: number,
    sampleAt: (localSeconds: number, atEnd: boolean) => Omit<Sample, "time">,
  ) => {
    const steps = Math.max(2, Math.ceil(seconds / SAMPLE_SECONDS));
    // 앞 구간의 끝과 겹치지 않도록 두 번째 구간부터는 처음 점을 건너뛴다.
    const firstStep = samples.length === 0 ? 0 : 1;
    for (let step = firstStep; step <= steps; step++) {
      const localSeconds = (seconds * step) / steps;
      samples.push({
        time: elapsed + localSeconds,
        ...sampleAt(localSeconds, step === steps),
      });
    }
    elapsed += seconds;
  };
  const resting = { climb: 0, airborne: false, tumble: 0 };

  // 1. 떨어진다.
  addSegment(fallSeconds, (seconds, atEnd) => ({
    traveled: fallSpeed * seconds,
    // 부딪히는 순간에는 계산 오차 없이 정확히 땅에 닿게 한다.
    height: atEnd
      ? 0
      : Math.max(0, start.height - 0.5 * gravity * seconds * seconds),
    climb: -gravity * seconds,
    // 높이 없이 내려놓으면 떨어지는 구간이 없으므로 떠 있지 않다.
    airborne: !atEnd && fallSeconds > 0,
    tumble: 0,
  }));
  const landingSeconds = elapsed;
  const landingIndex = samples.length - 1;
  // 부딪힌 순간과 그때의 세로 빠르기. 납작해지는 정도가 빠르기에 비례한다.
  const impacts = [{ time: elapsed, speed: impactSpeed }];
  const onGround = (seconds: number) =>
    fallTravel + traveledOnGround(seconds - landingSeconds);

  // 2. 부딪힐 때마다 가던 쪽으로 튕겨 오른다.
  bounceSpeeds.forEach((speed, index) => {
    const seconds = airSeconds[index];
    const from = elapsed;
    // 모난 열매는 세게 튕길수록 크게 기우뚱한다.
    const tumble = style.tumbleDegrees * (speed / bounceSpeeds[0]);
    addSegment(seconds, (local, atEnd) => ({
      traveled: onGround(from + local),
      height: atEnd
        ? 0
        : Math.max(0, speed * local - 0.5 * gravity * local * local),
      climb: speed - gravity * local,
      airborne: !atEnd,
      tumble: tumble * Math.sin((Math.PI * local) / seconds),
    }));
    impacts.push({ time: elapsed, speed });
  });

  // 3. 땅에서 구르거나 미끄러지다 멈춘다.
  const settleFrom = elapsed;
  addSegment(style.settleSeconds, (seconds) => ({
    ...resting,
    traveled: onGround(settleFrom + seconds),
    height: 0,
  }));

  // 4. 멈춘 뒤에도 출렁임이 다 잦아들 때까지 기다린다.
  addSegment(style.squashFadeSeconds * 3, () => ({
    ...resting,
    traveled: travel,
    height: 0,
  }));

  // 표본마다 열매 바닥의 화면 자리. 마지막은 계산 오차 없이 멈출 자리에 둔다.
  const restScreen = toScreen(view, rest);
  const screens = samples.map((sample, index) => {
    if (index === samples.length - 1) return restScreen;
    const share = travel === 0 ? 1 : sample.traveled / travel;
    return toScreen(view, {
      side: start.side + along.side * share,
      distance: start.distance + along.ahead * share,
      height: sample.height,
    });
  });
  const groundYOf = (depth: number) => view.horizonY + view.eyeHeight * depth;
  const turns = input.rollsLikeBall
    ? ballTurns(
        samples,
        screens.map((screen) => ({
          x: screen.x,
          y: groundYOf(screen.depth),
          depth: screen.depth,
        })),
        landingIndex,
        input.size,
        input.restTilt,
      )
    : undefined;
  // 처음 부딪힌 뒤 화면에서 오른쪽으로 가면 시계 방향으로 돈다.
  const turning = rollDirectionOf(
    restScreen.x - screens[landingIndex].x,
    along.side,
  );

  const squashAt = (time: number) =>
    impacts.reduce((sum, impact) => {
      const since = time - impact.time;
      if (since < 0) return sum;
      // 땅에 닿은 채 놓으면(높이 0) 부딪히는 빠르기가 없으므로 찌그러지지 않는다.
      if (impactSpeed === 0) return sum;
      const amount = style.squash * (impact.speed / impactSpeed);
      return (
        sum +
        amount *
          Math.exp(-since / style.squashFadeSeconds) *
          Math.cos((2 * Math.PI * since) / SQUASH_PERIOD)
      );
    }, 0);

  const flight: FruitFlight = {
    durationMs: elapsed * 1000,
    landingAt: landingSeconds / elapsed,
    times: [],
    offsetX: [],
    offsetY: [],
    nearness: [],
    shadowOffsetY: [],
    shadowScale: [],
    shadowOpacity: [],
    angle: [],
    stretchX: [],
    stretchY: [],
  };
  samples.forEach((sample, index) => {
    const isLast = index === samples.length - 1;
    const screen = screens[index];
    const groundY = groundYOf(screen.depth);
    const nearness = screen.depth / restScreen.depth;
    const shadow = shadowAt(sample.height, input.size);
    // 떠 있을 때는 빠를수록 길쭉하고, 부딪히면 납작해졌다가 출렁이며 돌아온다.
    const stretch = sample.airborne
      ? style.stretch * Math.min(1, Math.abs(sample.climb) / impactSpeed)
      : 0;
    const tall = (1 + stretch) * (1 - squashAt(sample.time));

    flight.times.push(isLast ? 1 : sample.time / elapsed);
    flight.offsetX.push(screen.x - restScreen.x);
    flight.offsetY.push(screen.y - restScreen.y);
    flight.nearness.push(nearness);
    flight.shadowOffsetY.push(groundY - restScreen.y);
    flight.shadowScale.push(nearness * shadow.scale);
    flight.shadowOpacity.push(shadow.opacity);
    flight.angle.push(turning * (turns ? turns[index] : sample.tumble));
    flight.stretchY.push(tall);
    // 부피가 그대로인 것처럼, 납작해지면 옆으로 퍼지고 길쭉해지면 좁아진다.
    flight.stretchX.push(1 / Math.sqrt(tall));
  });
  return flight;
}
