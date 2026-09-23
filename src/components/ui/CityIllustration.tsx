export function CityIllustration() {
  return (
    <svg
      className="city-illustration"
      viewBox="0 0 640 430"
      fill="none"
      role="img"
      aria-label="Illustration of Astana's skyline and Baiterek tower"
    >
      <defs>
        <linearGradient
          id="cityfade"
          x1="310"
          y1="50"
          x2="310"
          y2="410"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#afd6c9" />
          <stop offset="1" stopColor="#4c998c" />
        </linearGradient>
        <pattern
          id="windows"
          width="15"
          height="21"
          patternUnits="userSpaceOnUse"
        >
          <rect
            x="5"
            y="6"
            width="4"
            height="9"
            rx="1"
            fill="#ddf1d9"
            opacity=".5"
          />
        </pattern>
      </defs>
      <circle cx="358" cy="173" r="152" fill="#bfe8cf" opacity=".06" />
      <circle cx="358" cy="173" r="119" stroke="#aad6c4" opacity=".12" />
      <path d="M34 338 325 200 615 337 326 420Z" fill="#23685e" />
      <path
        d="m40 338 285 135 289-136M326 419v53"
        stroke="#95caba"
        strokeOpacity=".25"
      />
      <path
        d="m104 366 284-137M175 401l281-137M119 297l283 138M182 267l284 138"
        stroke="#82bca8"
        strokeOpacity=".22"
      />
      <path d="m235 357 94-46 90 44-94 45Z" fill="#7aaf94" opacity=".4" />
      <path d="m258 354 70-33 63 32-64 31Z" stroke="#c9d6a2" strokeWidth="2" />
      <g>
        <path d="M326 322 296 192h60Z" fill="url(#cityfade)" opacity=".35" />
        <path
          d="m305 190 22 134 20-134M295 190l33 132 30-132M312 190l15 134 11-134"
          stroke="#d8e6c4"
          strokeWidth="3"
        />
        <ellipse cx="327" cy="185" rx="34" ry="9" fill="#bfcbb0" />
        <circle cx="327" cy="155" r="35" fill="#dac981" />
        <path
          d="M298 141c21 12 36 12 58 0M293 155h68M298 170c20-10 37-10 58 0M327 120c-24 20-24 51 0 70M327 120c24 20 24 51 0 70"
          stroke="#9b9b68"
          opacity=".6"
        />
        <ellipse cx="327" cy="326" rx="17" ry="7" fill="#c9d8b4" />
      </g>
      <g>
        <path d="m149 286 45-22V149l-45 19Z" fill="#76a99d" />
        <path d="m194 264 30 15V163l-30-14Z" fill="#397e73" />
        <path d="m149 168 45-19 30 14-45 21Z" fill="#b5d6bd" />
        <path d="m154 170 35-16v105l-35 17Z" fill="url(#windows)" />
      </g>
      <g>
        <path d="m408 281 52-25V139l-52 22Z" fill="#8db5a1" />
        <path d="m460 256 30 15V153l-30-14Z" fill="#498c7d" />
        <path d="m408 161 52-22 30 14-51 24Z" fill="#b9d4b7" />
        <path d="m414 164 39-17v103l-39 21Z" fill="url(#windows)" />
      </g>
      <g>
        <path d="m92 309 35-17v-73l-35 17Z" fill="#72aa96" />
        <path d="m127 292 24 11v-72l-24-12Z" fill="#39796c" />
        <path d="m92 236 35-17 24 12-35 17Z" fill="#afcdb0" />
        <path d="m97 239 25-12v60l-25 12Z" fill="url(#windows)" />
      </g>
      <g>
        <path d="m451 336 40-20v-79l-40 19Z" fill="#77a693" />
        <path d="m491 316 30 14v-78l-30-15Z" fill="#377667" />
        <path d="m451 256 40-19 30 15-40 20Z" fill="#b3cfaf" />
        <path d="m456 258 28-14v65l-28 14Z" fill="url(#windows)" />
      </g>
      <path d="m224 281 26-66 24 43 22 35-37 18Z" fill="#91b9a0" />
      <path d="m250 215 9 96 37-18Z" fill="#55907e" />
      {[
        { x: 177, y: 324 },
        { x: 214, y: 346 },
        { x: 401, y: 321 },
        { x: 373, y: 366 },
        { x: 531, y: 310 },
        { x: 108, y: 344 },
      ].map(({ x, y }) => (
        <g key={x}>
          <path d={`M${x} ${y}v-23`} stroke="#a9b597" strokeWidth="3" />
          <ellipse cx={x} cy={y - 26} rx="12" ry="18" fill="#81af83" />
          <ellipse cx={x - 3} cy={y - 30} rx="7" ry="12" fill="#abd29c" />
        </g>
      ))}
      <path
        d="M471 96h34M488 79v34M189 110h20M199 100v20"
        stroke="#b7d8b4"
        opacity=".55"
      />
      <circle cx="121" cy="174" r="3" fill="#d0dcac" />
      <circle cx="427" cy="64" r="3" fill="#d0dcac" />
    </svg>
  );
}
