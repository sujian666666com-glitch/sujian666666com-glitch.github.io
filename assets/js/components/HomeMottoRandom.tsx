import React, { useEffect, useRef, useState } from "react";

const mottoText = "Break the problem down, Build the system up, Keep life moving.";

type MottoVariant = () => React.ReactElement;

export function StairMotto() {
  return (
    <svg
      className="home-motto__svg home-motto__svg--stair"
      viewBox="0 0 1200 520"
      role="img"
      aria-label={mottoText}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        className="home-motto__line home-motto__draw"
        pathLength={1}
        d="M58 438 C152 438 236 438 328 438 L328 318 C412 318 502 318 592 318 L592 220 C676 220 764 220 850 220 L850 134 C946 134 1040 134 1142 134"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "160ms" } as React.CSSProperties}
        d="M61 443 C162 449 246 446 328 443"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "340ms" } as React.CSSProperties}
        d="M590 323 C670 328 766 325 850 325"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__line--dashed home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "520ms" } as React.CSSProperties}
        d="M142 350 C160 288 199 247 258 225"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "620ms" } as React.CSSProperties}
        d="M257 225 l-22 -2 M257 225 l-13 19"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__line--dashed home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "780ms" } as React.CSSProperties}
        d="M606 232 C628 186 677 155 737 143"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "880ms" } as React.CSSProperties}
        d="M736 143 l-20 -7 M736 143 l-12 18"
      />
      <path
        className="home-motto__accent home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "1100ms" } as React.CSSProperties}
        d="M872 184 C925 176 1000 174 1062 180"
      />

      <text className="home-motto__copy home-motto__copy--small" x="76" y="350" style={{ "--motto-delay": "760ms" } as React.CSSProperties}>
        Break the
      </text>
      <text className="home-motto__copy home-motto__copy--small" x="76" y="401" style={{ "--motto-delay": "840ms" } as React.CSSProperties}>
        problem down,
      </text>
      <text className="home-motto__copy home-motto__copy--medium" x="414" y="230" style={{ "--motto-delay": "1030ms" } as React.CSSProperties}>
        Build the
      </text>
      <text className="home-motto__copy home-motto__copy--medium" x="414" y="286" style={{ "--motto-delay": "1110ms" } as React.CSSProperties}>
        system up,
      </text>
      <text className="home-motto__copy home-motto__copy--large" x="873" y="92" style={{ "--motto-delay": "1320ms" } as React.CSSProperties}>
        Keep life
      </text>
      <text className="home-motto__copy home-motto__copy--large" x="873" y="171" style={{ "--motto-delay": "1400ms" } as React.CSSProperties}>
        moving.
      </text>

      <circle className="home-motto__dot" cx="366" cy="308" r="4" style={{ "--motto-delay": "1160ms" } as React.CSSProperties} />
      <circle className="home-motto__dot" cx="810" cy="210" r="3" style={{ "--motto-delay": "1260ms" } as React.CSSProperties} />
      <path
        className="home-motto__star"
        style={{ "--motto-delay": "1530ms" } as React.CSSProperties}
        d="M1102 34 C1108 48 1113 52 1127 58 C1113 64 1109 69 1103 83 C1097 69 1092 64 1078 58 C1092 52 1096 48 1102 34Z"
      />
    </svg>
  );
}

export function CircularMotto() {
  return (
    <svg
      className="home-motto__svg home-motto__svg--circular"
      viewBox="0 0 1200 520"
      role="img"
      aria-label={mottoText}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        className="home-motto__line home-motto__draw"
        pathLength={1}
        d="M326 354 C228 288 225 171 338 104"
      />
      <path
        className="home-motto__line home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "240ms" } as React.CSSProperties}
        d="M862 106 C979 174 970 306 858 374"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__line--dashed home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "500ms" } as React.CSSProperties}
        d="M318 396 C432 463 712 467 884 393"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__line--dashed home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "560ms" } as React.CSSProperties}
        d="M326 88 C466 24 716 23 873 89"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "720ms" } as React.CSSProperties}
        d="M338 104 l-28 -1 M338 104 l-13 23 M858 374 l29 -3 M858 374 l13 -24"
      />

      <text className="home-motto__copy home-motto__copy--medium" textAnchor="middle" x="600" y="89" style={{ "--motto-delay": "1160ms" } as React.CSSProperties}>
        Break the
      </text>
      <text className="home-motto__copy home-motto__copy--medium" textAnchor="middle" x="600" y="143" style={{ "--motto-delay": "1240ms" } as React.CSSProperties}>
        problem down,
      </text>
      <text className="home-motto__copy home-motto__copy--xl" textAnchor="middle" x="600" y="242" style={{ "--motto-delay": "560ms" } as React.CSSProperties}>
        Keep life
      </text>
      <text className="home-motto__copy home-motto__copy--xl" textAnchor="middle" x="600" y="329" style={{ "--motto-delay": "640ms" } as React.CSSProperties}>
        moving.
      </text>
      <path
        className="home-motto__accent home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "900ms" } as React.CSSProperties}
        d="M506 350 C558 342 652 341 715 348"
      />
      <text className="home-motto__copy home-motto__copy--medium" textAnchor="middle" x="600" y="424" style={{ "--motto-delay": "1360ms" } as React.CSSProperties}>
        Build the
      </text>
      <text className="home-motto__copy home-motto__copy--medium" textAnchor="middle" x="600" y="478" style={{ "--motto-delay": "1440ms" } as React.CSSProperties}>
        system up,
      </text>

      <path
        className="home-motto__star"
        style={{ "--motto-delay": "1040ms" } as React.CSSProperties}
        d="M252 248 C260 263 265 268 280 275 C265 281 260 286 253 302 C247 286 242 281 227 275 C242 268 247 263 252 248Z"
      />
      <path
        className="home-motto__star"
        style={{ "--motto-delay": "1120ms" } as React.CSSProperties}
        d="M948 246 C956 262 961 267 976 274 C961 280 956 286 949 302 C943 286 938 280 923 274 C938 267 943 262 948 246Z"
      />
      <circle className="home-motto__dot" cx="362" cy="103" r="3.5" style={{ "--motto-delay": "900ms" } as React.CSSProperties} />
      <circle className="home-motto__dot" cx="839" cy="377" r="3.5" style={{ "--motto-delay": "980ms" } as React.CSSProperties} />
    </svg>
  );
}

export function VortexMotto() {
  return (
    <svg
      className="home-motto__svg home-motto__svg--vortex"
      viewBox="0 0 1200 520"
      role="img"
      aria-label={mottoText}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        className="home-motto__line home-motto__line--thin home-motto__line--dashed home-motto__draw"
        pathLength={1}
        d="M440 88 C578 29 784 67 844 176 C913 301 792 423 634 419 C450 414 337 263 412 149 C488 34 722 44 835 155"
      />
      <path
        className="home-motto__line home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "260ms" } as React.CSSProperties}
        d="M468 131 C583 69 754 91 810 185 C877 297 770 379 648 378 C510 376 431 269 492 181 C548 101 712 104 789 188"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "520ms" } as React.CSSProperties}
        d="M530 174 C609 126 725 141 760 205 C800 279 727 333 648 331 C559 329 510 266 552 214 C591 166 688 168 731 214"
      />
      <path
        className="home-motto__line home-motto__line--thin home-motto__line--dashed home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "760ms" } as React.CSSProperties}
        d="M592 214 C636 188 700 198 718 232 C739 272 697 299 654 294 C611 289 592 259 615 237"
      />

      <text className="home-motto__copy home-motto__copy--large" textAnchor="middle" x="645" y="233" style={{ "--motto-delay": "820ms" } as React.CSSProperties}>
        Keep life
      </text>
      <text className="home-motto__copy home-motto__copy--large" textAnchor="middle" x="645" y="312" style={{ "--motto-delay": "900ms" } as React.CSSProperties}>
        moving.
      </text>
      <path
        className="home-motto__accent home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "1160ms" } as React.CSSProperties}
        d="M558 331 C605 323 680 323 734 329"
      />

      <text className="home-motto__copy home-motto__copy--medium" x="75" y="224" style={{ "--motto-delay": "1260ms" } as React.CSSProperties}>
        Break the
      </text>
      <text className="home-motto__copy home-motto__copy--medium" x="75" y="280" style={{ "--motto-delay": "1340ms" } as React.CSSProperties}>
        problem down,
      </text>
      <path
        className="home-motto__line home-motto__line--thin home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "1360ms" } as React.CSSProperties}
        d="M74 304 C138 300 224 302 286 306 M319 304 C362 286 389 260 427 234"
      />
      <circle className="home-motto__dot home-motto__dot--large" cx="310" cy="305" r="9" style={{ "--motto-delay": "1480ms" } as React.CSSProperties} />

      <text className="home-motto__copy home-motto__copy--medium" x="895" y="224" style={{ "--motto-delay": "1420ms" } as React.CSSProperties}>
        Build the
      </text>
      <text className="home-motto__copy home-motto__copy--medium" x="895" y="280" style={{ "--motto-delay": "1500ms" } as React.CSSProperties}>
        system up,
      </text>
      <path
        className="home-motto__line home-motto__line--thin home-motto__draw"
        pathLength={1}
        style={{ "--motto-delay": "1520ms" } as React.CSSProperties}
        d="M895 304 C952 302 1018 303 1082 306 M864 304 C817 285 792 259 760 234"
      />
      <circle className="home-motto__dot home-motto__dot--large" cx="874" cy="305" r="8" style={{ "--motto-delay": "1640ms" } as React.CSSProperties} />

      <circle className="home-motto__dot" cx="410" cy="108" r="2.4" style={{ "--motto-delay": "680ms" } as React.CSSProperties} />
      <circle className="home-motto__dot" cx="790" cy="380" r="2.4" style={{ "--motto-delay": "760ms" } as React.CSSProperties} />
      <path
        className="home-motto__star"
        style={{ "--motto-delay": "1740ms" } as React.CSSProperties}
        d="M1016 72 C1025 91 1030 96 1049 105 C1030 113 1025 119 1017 137 C1009 119 1004 113 985 105 C1004 96 1009 91 1016 72Z"
      />
    </svg>
  );
}

const mottoVariants = [StairMotto, CircularMotto, VortexMotto];

export function HomeMottoRandom() {
  const [variantIndex, setVariantIndex] = useState(0);
  const [animationSeed, setAnimationSeed] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const Variant = mottoVariants[variantIndex];

  useEffect(() => {
    setVariantIndex(Math.floor(Math.random() * mottoVariants.length));
    setAnimationSeed((seed) => seed + 1);
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    function showNextVariant() {
      setVariantIndex((index) => (index + 1) % mottoVariants.length);
      setAnimationSeed((seed) => seed + 1);
    }

    button.addEventListener("click", showNextVariant);
    return () => button.removeEventListener("click", showNextVariant);
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="home-motto"
      aria-label={`${mottoText} Click to switch layout.`}
    >
      <span className="home-motto__paper" aria-hidden="true" />
      <Variant key={`${variantIndex}-${animationSeed}`} />
    </button>
  );
}
