export function Buffalo({ happy = false }: { happy?: boolean }) {
  return <svg viewBox="0 0 220 200" aria-hidden="true" className="quan-buffalo">
    <ellipse cx="110" cy="180" rx="70" ry="11" fill="#6d795020" />
    <path d="M56 78C12 91 12 39 30 26c-3 27 12 33 34 25M164 78c44 13 44-39 26-52 3 27-12 33-34 25" fill="#d5c59d" stroke="#6c6e57" strokeWidth="3" />
    <path d="M66 73C43 29 176 26 159 73l13 38c6 39-24 66-62 65s-66-27-61-62Z" fill="#777c6a" stroke="#4d5b4c" strokeWidth="3" />
    <ellipse cx="51" cy="97" rx="17" ry="22" fill="#777c6a" stroke="#4d5b4c" strokeWidth="3" /><ellipse cx="169" cy="97" rx="17" ry="22" fill="#777c6a" stroke="#4d5b4c" strokeWidth="3" />
    <ellipse cx="110" cy="133" rx="49" ry="31" fill="#c9c6a5" /><ellipse cx="89" cy="128" rx="5" ry="7" fill="#5c6954" /><ellipse cx="130" cy="128" rx="5" ry="7" fill="#5c6954" />
    {happy?<g stroke="#283c30" strokeWidth="4" fill="none" strokeLinecap="round"><path d="m75 99 7-5 7 5m42 0 7-5 7 5" /></g>:<g fill="#293b2e"><ellipse cx="82" cy="96" rx="5" ry="7" /><ellipse cx="139" cy="96" rx="5" ry="7" /><circle cx="80" cy="93" r="1.5" fill="white" /><circle cx="137" cy="93" r="1.5" fill="white" /></g>}
    <path d="M99 148q11 10 23-1" fill="none" stroke="#66705a" strokeWidth="3" strokeLinecap="round" /><ellipse cx="66" cy="115" rx="10" ry="5" fill="#dfa996" opacity=".8" /><ellipse cx="154" cy="115" rx="10" ry="5" fill="#dfa996" opacity=".8" />
    <path d="m44 67 66-56 66 56q-66 21-132 0Z" fill="#edd495" stroke="#aa8c54" strokeWidth="2.5" /><path d="m53 65 57-45 57 45M65 69l45-49 45 49M83 73l27-53 27 53" fill="none" stroke="#c8a76a" strokeWidth="1" /><path d="M44 67q66 20 132 0" fill="none" stroke="#f6e7be" strokeWidth="5" />
    <path d="m155 132 26-16 10 6-29 20" fill="#5f9b62" /><path d="m172 122 7-21 8-1-5 19" fill="#77ae71" />
  </svg>;
}
export function VillageLandscape() {
  return <svg className="quan-landscape" viewBox="0 0 1200 250" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <circle cx="936" cy="66" r="35" fill="#edc875" /><g fill="#fff9"><ellipse cx="214" cy="57" rx="46" ry="10" /><ellipse cx="253" cy="51" rx="27" ry="15" /><ellipse cx="789" cy="38" rx="35" ry="8" /></g>
    <path d="M0 135Q118 25 272 117T560 108T870 115T1200 108V250H0Z" fill="#c0cfa2" /><path d="M0 174Q135 100 305 161T638 145T978 166T1200 137V250H0Z" fill="#93b588" />
    <path d="M0 220Q245 124 541 194T1200 171V250H0Z" fill="#c5cc8b" /><path d="M0 240Q244 150 555 217T1200 192M18 250q235-72 522-17t660-19" fill="none" stroke="#eddfa1" strokeWidth="5" />
    <g transform="translate(159 119)"><path d="M0 34h74v44H0Z" fill="#e9d5a3" /><path d="m-13 38 50-39 51 39Z" fill="#bc7354" /><path d="m-17 38 54-34 55 34" stroke="#815e41" strokeWidth="5" fill="none" /><path d="M28 78V47h20v31" fill="#85754d" /><rect x="7" y="49" width="12" height="13" rx="2" fill="#9c9a68" /></g>
    <g stroke="#4c8260" strokeWidth="7" strokeLinecap="round"><path d="M1100 248 1086 48m-6 200-14-166m44 166 10-136" /><path d="m1089 99-29-12m28 37 29-11m-46 47-27-8m58 34 31-9" strokeWidth="4" /></g><g fill="#639b65"><path d="M1090 91q-68-40-50-54 18 2 50 54m-4 5q66-57 82-40-10 20-82 40m-11 48q-74-31-75-6 18 15 75 6m35 24q48-60 69-39-3 14-69 39" /></g>
    <path d="M637 75q10-12 20 0 10-12 20 0m57 19q8-9 16 0 8-9 16 0" stroke="#7d9271" strokeWidth="2" fill="none" />
  </svg>;
}
