export function CityArt() {
  return (
    <svg
      className="city-art"
      viewBox="0 0 560 260"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" stroke="#dce4d4" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect width="560" height="260" fill="url(#grid)" />
      <circle cx="425" cy="64" r="35" fill="#e9c66b" />
      <path
        d="M0 224C90 180 150 255 254 213S455 184 560 230"
        stroke="#c4d9cc"
        strokeWidth="26"
      />
      <g stroke="#436959" strokeWidth="2" strokeLinejoin="round">
        <path
          d="M32 194v-61h47v61M39 142h33m-33 12h33m-33 12h33m-23-33v61m12-61v61"
          fill="#e3eadd"
        />
        <path
          d="M102 194v-91l29-16 28 16v91M111 115h39m-39 14h39m-39 14h39m-39 14h39m-39 14h39m-20-68v91"
          fill="#cedecb"
        />
        <path
          d="M178 194v-55l29-26 29 26v55M187 149h40m-40 13h40m-40 13h40"
          fill="#edf0e4"
        />
        <path d="M285 194 273 110h29l-12 84m-11-61h18m-15 26h11m-14-50-10-14m26 14 10-14" />
        <circle cx="287" cy="85" r="22" fill="#e8c577" />
        <path
          d="M267 83h40m-38-8h36m-34 20h31m-15-31c-15 13-15 30 0 43 15-13 15-30 0-43Z"
          stroke="#a88b4c"
          strokeWidth="1"
        />
        <path
          d="M321 194v-49l31-53 31 53v49M321 145h62m-53 12h44m-44 13h44m-44 13h44"
          fill="#cddcc8"
        />
        <path
          d="M401 194v-87h33v87m-25-75h17m-17 14h17m-17 14h17m-17 14h17m-17 14h17"
          fill="#e7ecde"
        />
        <path d="m449 194 35-60 37 60h-72Zm35-60v60m-22-23h45" fill="#d8e3ce" />
        <path d="M15 195h525" />
        <path
          d="M86 195v-19m0 7c-23 0-15-29 0-32 15 3 23 32 0 32Zm160 12v-15m0 3c-18 0-12-22 0-25 12 3 18 25 0 25Zm147 12v-15m0 3c-18 0-12-22 0-25 12 3 18 25 0 25Z"
          fill="#9ebc93"
        />
      </g>
      <path
        d="M65 226h55m277 9h77M158 242h85"
        stroke="#fcfcf4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
