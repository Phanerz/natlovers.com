"use client";

import {useEffect, useState} from "react";
import {useReducedMotion, useSpring} from "framer-motion";

export function AnimatedNumber({value, format}: {value: number; format: (n: number) => string}) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(value, {stiffness: 210, damping: 26, mass: 0.9});
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduceMotion) {
      spring.jump(value);
      setDisplay(value);
      return;
    }
    spring.set(value);
  }, [value, reduceMotion, spring]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => setDisplay(latest));
    return unsubscribe;
  }, [spring]);

  return <>{format(display)}</>;
}
