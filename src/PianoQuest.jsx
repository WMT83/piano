import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ============================================================
   PIANO QUEST — a guided piano course for young beginners.
   Rookie → Player → Virtuoso, 26 lessons.
   Plays with: on-screen keys, computer keyboard, or a real
   MIDI keyboard over USB (Web MIDI — Chrome/Edge).
   ============================================================ */

/* ---------- DESIGN TOKENS ---------- */
const T = {
  ink: "#3A1329",
  velvet: "#4C1B3B",
  panel: "#5E2349",
  raised: "#762F5C",
  line: "#9A3F78",
  brass: "#E8B04B",
  ribbon: "#FF5D8F",
  mint: "#4FD1A0",
  ivory: "#F4EDE4",
  muted: "#E7ADCE",
  danger: "#F2704B",
  pink: "#FF8AC0",
};
const RH = T.brass;   // right hand
const LH = T.ribbon;  // left hand
const FONTS = ``; // fonts are self-hosted in fonts.css so the app works offline

/* ---------- MUSIC HELPERS ---------- */
const PC_DIA = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const PC_SHARP = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const isBlack = (m) => PC_SHARP[m % 12] === 1;
const octaveOf = (m) => Math.floor(m / 12) - 1;
const diaStep = (m) => octaveOf(m) * 7 + PC_DIA[m % 12];
const noteName = (m) => LETTERS[PC_DIA[m % 12]] + (isBlack(m) ? "\u266F" : "");
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TREBLE_BOTTOM = diaStep(64); // E4
const BASS_BOTTOM = diaStep(43);   // G2

/* ---------- SONGS (public domain, plus one original study) ---------- */
const n = (b, m, d = 1, h = "R") => ({ b, m, d, h });
const chord = (beat, midis, dur) => midis.map((m) => n(beat, m, dur, "L"));

const SONGS = {
  hotCross: {
    title: "Hot Cross Buns", bpm: 68, ts: 4, range: [60, 72], hands: "R",
    blurb: "Three notes. That's the whole song.",
    notes: [
      n(0, 64), n(1, 62), n(2, 60, 2),
      n(4, 64), n(5, 62), n(6, 60, 2),
      n(8, 60, .5), n(8.5, 60, .5), n(9, 60, .5), n(9.5, 60, .5),
      n(10, 62, .5), n(10.5, 62, .5), n(11, 62, .5), n(11.5, 62, .5),
      n(12, 64), n(13, 62), n(14, 60, 2),
    ],
  },
  mary: {
    title: "Mary Had a Little Lamb", bpm: 84, ts: 4, range: [60, 72], hands: "R",
    blurb: "Five fingers, no moving. Stay in C position.",
    notes: [
      n(0, 64), n(1, 62), n(2, 60), n(3, 62),
      n(4, 64), n(5, 64), n(6, 64, 2),
      n(8, 62), n(9, 62), n(10, 62, 2),
      n(12, 64), n(13, 67), n(14, 67, 2),
      n(16, 64), n(17, 62), n(18, 60), n(19, 62),
      n(20, 64), n(21, 64), n(22, 64), n(23, 64),
      n(24, 62), n(25, 62), n(26, 64), n(27, 62),
      n(28, 60, 4),
    ],
  },
  odeToJoy: {
    title: "Ode to Joy", bpm: 88, ts: 4, range: [60, 72], hands: "R",
    blurb: "Beethoven wrote this when he could no longer hear it.",
    notes: [
      n(0, 64), n(1, 64), n(2, 65), n(3, 67),
      n(4, 67), n(5, 65), n(6, 64), n(7, 62),
      n(8, 60), n(9, 60), n(10, 62), n(11, 64),
      n(12, 64, 1.5), n(13.5, 62, .5), n(14, 62, 2),
      n(16, 64), n(17, 64), n(18, 65), n(19, 67),
      n(20, 67), n(21, 65), n(22, 64), n(23, 62),
      n(24, 60), n(25, 60), n(26, 62), n(27, 64),
      n(28, 62, 1.5), n(29.5, 60, .5), n(30, 60, 2),
    ],
  },
  frere: {
    title: "Fr\u00E8re Jacques", bpm: 96, ts: 4, range: [53, 72], hands: "B",
    blurb: "Right hand sings. Left hand answers on the low G.",
    notes: [
      n(0, 60), n(1, 62), n(2, 64), n(3, 60),
      n(4, 60), n(5, 62), n(6, 64), n(7, 60),
      n(8, 64), n(9, 65), n(10, 67, 2),
      n(12, 64), n(13, 65), n(14, 67, 2),
      n(16, 67, .5), n(16.5, 69, .5), n(17, 67, .5), n(17.5, 65, .5), n(18, 64), n(19, 60),
      n(20, 67, .5), n(20.5, 69, .5), n(21, 67, .5), n(21.5, 65, .5), n(22, 64), n(23, 60),
      n(24, 60), n(25, 55, 1, "L"), n(26, 60, 2),
      n(28, 60), n(29, 55, 1, "L"), n(30, 60, 2),
    ],
  },
  saints: {
    title: "When the Saints Go Marching In", bpm: 104, ts: 4, range: [43, 72], hands: "B",
    blurb: "A New Orleans parade. The left hand keeps the march.",
    notes: [
      n(1, 60), n(2, 64), n(3, 65), n(4, 67, 3), n(4, 48, 4, "L"),
      n(9, 60), n(10, 64), n(11, 65), n(12, 67, 3), n(12, 48, 4, "L"),
      n(17, 60), n(18, 64), n(19, 65), n(20, 67, 2), n(22, 64, 2), n(20, 48, 4, "L"),
      n(24, 60, 2), n(26, 64), n(27, 62), n(24, 48, 4, "L"),
      n(28, 60, 4), n(28, 48, 4, "L"),
      n(32, 64, 2), n(34, 64), n(35, 62), n(32, 48, 4, "L"),
      n(36, 60, 2), n(38, 60, 2), n(36, 48, 4, "L"),
      n(40, 64, 2), n(42, 67, 2), n(40, 43, 4, "L"),
      n(44, 67, 2), n(46, 65, 2), n(44, 43, 4, "L"),
      n(49, 60), n(50, 64), n(51, 65), n(52, 67, 2), n(54, 64, 2), n(52, 48, 4, "L"),
      n(56, 60, 2), n(58, 62, 2), n(56, 43, 4, "L"),
      n(60, 60, 4), n(60, 48, 4, "L"),
    ],
  },
  twinkle: {
    title: "Twinkle, Twinkle, Little Star", bpm: 90, ts: 4, range: [45, 72], hands: "B",
    blurb: "Melody on top, real chords underneath. Hands together.",
    notes: [
      n(0, 60), n(1, 60), n(2, 67), n(3, 67),
      n(4, 69), n(5, 69), n(6, 67, 2),
      n(8, 65), n(9, 65), n(10, 64), n(11, 64),
      n(12, 62), n(13, 62), n(14, 60, 2),
      n(16, 67), n(17, 67), n(18, 65), n(19, 65),
      n(20, 64), n(21, 64), n(22, 62, 2),
      n(24, 67), n(25, 67), n(26, 65), n(27, 65),
      n(28, 64), n(29, 64), n(30, 62, 2),
      n(32, 60), n(33, 60), n(34, 67), n(35, 67),
      n(36, 69), n(37, 69), n(38, 67, 2),
      n(40, 65), n(41, 65), n(42, 64), n(43, 64),
      n(44, 62), n(45, 62), n(46, 60, 2),
      ...chord(0, [48, 52, 55], 4), ...chord(4, [48, 53, 57], 2), ...chord(6, [48, 52, 55], 2),
      ...chord(8, [48, 53, 57], 2), ...chord(10, [48, 52, 55], 2),
      ...chord(12, [47, 50, 55], 2), ...chord(14, [48, 52, 55], 2),
      ...chord(16, [48, 52, 55], 2), ...chord(18, [48, 53, 57], 2),
      ...chord(20, [48, 52, 55], 2), ...chord(22, [47, 50, 55], 2),
      ...chord(24, [48, 52, 55], 2), ...chord(26, [48, 53, 57], 2),
      ...chord(28, [48, 52, 55], 2), ...chord(30, [47, 50, 55], 2),
      ...chord(32, [48, 52, 55], 4), ...chord(36, [48, 53, 57], 2), ...chord(38, [48, 52, 55], 2),
      ...chord(40, [48, 53, 57], 2), ...chord(42, [48, 52, 55], 2),
      ...chord(44, [47, 50, 55], 2), ...chord(46, [48, 52, 55], 2),
    ],
  },
  odeHT: {
    title: "Ode to Joy \u2014 Hands Together", bpm: 78, ts: 4, range: [45, 72], hands: "B",
    blurb: "The melody you already know. Now add the chords underneath.",
    notes: [
      n(0, 64), n(1, 64), n(2, 65), n(3, 67),
      n(4, 67), n(5, 65), n(6, 64), n(7, 62),
      n(8, 60), n(9, 60), n(10, 62), n(11, 64),
      n(12, 64, 1.5), n(13.5, 62, .5), n(14, 62, 2),
      n(16, 64), n(17, 64), n(18, 65), n(19, 67),
      n(20, 67), n(21, 65), n(22, 64), n(23, 62),
      n(24, 60), n(25, 60), n(26, 62), n(27, 64),
      n(28, 62, 1.5), n(29.5, 60, .5), n(30, 60, 2),
      ...chord(0, [48, 52, 55], 4), ...chord(4, [48, 52, 55], 2), ...chord(6, [47, 50, 55], 2),
      ...chord(8, [48, 52, 55], 2), ...chord(10, [47, 50, 55], 2),
      ...chord(12, [48, 52, 55], 2), ...chord(14, [47, 50, 55], 2),
      ...chord(16, [48, 52, 55], 4), ...chord(20, [48, 52, 55], 2), ...chord(22, [47, 50, 55], 2),
      ...chord(24, [48, 52, 55], 2), ...chord(26, [47, 50, 55], 2),
      ...chord(28, [47, 50, 55], 2), ...chord(30, [48, 52, 55], 2),
    ],
  },
  jingle: {
    title: "Jingle Bells", bpm: 112, ts: 4, range: [45, 72], hands: "B",
    blurb: "Fast, bouncy, lots of repeated notes. Keep the wrist loose.",
    notes: [
      n(0, 64), n(1, 64), n(2, 64, 2),
      n(4, 64), n(5, 64), n(6, 64, 2),
      n(8, 64), n(9, 67), n(10, 60), n(11, 62),
      n(12, 64, 4),
      n(16, 65), n(17, 65), n(18, 65, 1.5), n(19.5, 65, .5),
      n(20, 65), n(21, 64), n(22, 64), n(23, 64, .5), n(23.5, 64, .5),
      n(24, 64), n(25, 62), n(26, 62), n(27, 64),
      n(28, 62, 2), n(30, 67, 2),
      n(32, 64), n(33, 64), n(34, 64, 2),
      n(36, 64), n(37, 64), n(38, 64, 2),
      n(40, 64), n(41, 67), n(42, 60), n(43, 62),
      n(44, 64, 4),
      n(48, 65), n(49, 65), n(50, 65, 1.5), n(51.5, 65, .5),
      n(52, 65), n(53, 64), n(54, 64), n(55, 64, .5), n(55.5, 64, .5),
      n(56, 67), n(57, 67), n(58, 65), n(59, 62),
      n(60, 60, 4),
      ...chord(0, [48, 52, 55], 4), ...chord(4, [48, 52, 55], 4),
      ...chord(8, [48, 52, 55], 4), ...chord(12, [48, 52, 55], 4),
      ...chord(16, [48, 53, 57], 4), ...chord(20, [48, 52, 55], 4),
      ...chord(24, [47, 50, 55], 4), ...chord(28, [47, 50, 55], 4),
      ...chord(32, [48, 52, 55], 4), ...chord(36, [48, 52, 55], 4),
      ...chord(40, [48, 52, 55], 4), ...chord(44, [48, 52, 55], 4),
      ...chord(48, [48, 53, 57], 4), ...chord(52, [48, 52, 55], 4),
      ...chord(56, [47, 50, 55], 4), ...chord(60, [48, 52, 55], 4),
    ],
  },
  scaleStudy: {
    title: "C Major Scale Study", bpm: 76, ts: 4, range: [60, 72], hands: "R",
    blurb: "The thumb tucks under after E. That one move unlocks every scale.",
    notes: [
      n(0, 60), n(1, 62), n(2, 64), n(3, 65),
      n(4, 67), n(5, 69), n(6, 71), n(7, 72, 2),
      n(10, 71), n(11, 69), n(12, 67), n(13, 65),
      n(14, 64), n(15, 62), n(16, 60, 4),
    ],
  },
  furElise: {
    title: "F\u00FCr Elise \u2014 Opening Theme", bpm: 68, ts: 3, range: [40, 79], hands: "B",
    blurb: "Beethoven again. Black keys, both hands, real repertoire.",
    notes: [
      n(2, 76, .5), n(2.5, 75, .5),
      n(3, 76, .5), n(3.5, 75, .5), n(4, 76, .5), n(4.5, 71, .5), n(5, 74, .5), n(5.5, 72, .5),
      n(6, 69, 1), n(7, 60, .5), n(7.5, 64, .5), n(8, 69, 1),
      n(6, 45, 1, "L"), n(7, 52, 1, "L"), n(8, 57, 1, "L"),
      n(9, 71, 1), n(10, 64, .5), n(10.5, 68, .5), n(11, 71, 1),
      n(9, 40, 1, "L"), n(10, 52, 1, "L"), n(11, 56, 1, "L"),
      n(12, 72, 1), n(13, 64, .5), n(13.5, 76, .5), n(14, 75, .5), n(14.5, 76, .5),
      n(12, 45, 1, "L"), n(13, 52, 1, "L"), n(14, 57, 1, "L"),
      n(15, 76, .5), n(15.5, 75, .5), n(16, 76, .5), n(16.5, 71, .5), n(17, 74, .5), n(17.5, 72, .5),
      n(18, 69, 1), n(19, 60, .5), n(19.5, 64, .5), n(20, 69, 1),
      n(18, 45, 1, "L"), n(19, 52, 1, "L"), n(20, 57, 1, "L"),
      n(21, 71, 1), n(22, 64, .5), n(22.5, 72, .5), n(23, 71, 1),
      n(21, 40, 1, "L"), n(22, 52, 1, "L"), n(23, 56, 1, "L"),
      n(24, 69, 3), n(24, 45, 1, "L"), n(25, 52, 1, "L"), n(26, 57, 1, "L"),
    ],
  },
  auclair: {
    title: "Au Clair de la Lune", bpm: 96, ts: 4, range: [60, 72], hands: "R",
    blurb: "A gentle French tune. Three notes, stepping up and down.",
    notes: [
      n(0, 60), n(1, 60), n(2, 60), n(3, 62),
      n(4, 64, 2), n(6, 62, 2),
      n(8, 60), n(9, 64), n(10, 62), n(11, 62),
      n(12, 60, 4),
    ],
  },
  hotCrossLeft: {
    title: "Hot Cross Buns — Left Hand", bpm: 68, ts: 4, range: [48, 60], hands: "B",
    blurb: "The tune you already know — now with your left hand, lower down.",
    notes: [
      n(0, 52, 1, "L"), n(1, 50, 1, "L"), n(2, 48, 2, "L"),
      n(4, 52, 1, "L"), n(5, 50, 1, "L"), n(6, 48, 2, "L"),
      n(8, 48, .5, "L"), n(8.5, 48, .5, "L"), n(9, 48, .5, "L"), n(9.5, 48, .5, "L"),
      n(10, 50, .5, "L"), n(10.5, 50, .5, "L"), n(11, 50, .5, "L"), n(11.5, 50, .5, "L"),
      n(12, 52, 1, "L"), n(13, 50, 1, "L"), n(14, 48, 2, "L"),
    ],
  },
  firstDuet: {
    title: "Both Hands Warm-Up", bpm: 80, ts: 4, range: [48, 72], hands: "B",
    blurb: "Right hand walks up and back. Left hand holds one note underneath.",
    notes: [
      n(0, 60), n(1, 62), n(2, 64), n(3, 65),
      n(4, 67, 4),
      n(8, 65), n(9, 64), n(10, 62), n(11, 60),
      n(12, 60, 4),
      n(0, 48, 4, "L"), n(4, 55, 4, "L"), n(8, 48, 4, "L"), n(12, 48, 4, "L"),
    ],
  },
};

/* ---------- CURRICULUM ---------- */
const LESSONS = [
  /* ===== LEVEL 1 — ROOKIE ===== */
  {
    id: "keyboard-map", lvl: 1, title: "The Keyboard Map", xp: 20, kind: "find",
    concept: {
      big: "Black keys come in groups of 2 and 3.",
      body: "That is the secret map of the whole piano. Find a group of TWO black keys \u2014 the white key just to the left of them is always C. Every single C on the piano sits in exactly the same spot.",
      points: ["Groups of 2 black keys, then groups of 3", "C is always just left of a 2-black-key group", "The pattern repeats all the way up and down"],
    },
    find: { prompt: "Play every C you can find", targets: [48, 60, 72], range: [48, 84] },
  },
  {
    id: "finger-numbers", lvl: 1, title: "Finger Numbers", xp: 20, kind: "concept",
    concept: {
      big: "Thumb is 1. Pinky is 5. Both hands.",
      body: "Piano music tells you which finger to use with little numbers. Thumbs are always 1, and you count outward to the pinky, which is always 5. Both hands use the same numbering \u2014 they are mirror images of each other.",
      points: ["1 = thumb, 2 = index, 3 = middle, 4 = ring, 5 = pinky", "Same numbers on both hands", "Curve your fingers like you are holding a bubble"],
    },
  },
  {
    id: "c-position", lvl: 1, title: "C Position, Right Hand", xp: 25, kind: "find",
    concept: {
      big: "Thumb on middle C. Now don't move your hand.",
      body: "Put your right thumb on middle C. One finger per key: C-D-E-F-G. This is C Position, and you can play a surprising number of songs without moving your hand at all.",
      points: ["Thumb (1) on middle C", "One finger per white key: C D E F G", "Fingers stay on their keys, even when they're resting"],
    },
    find: { prompt: "Play C, D, E, F, G in order", targets: [60, 62, 64, 65, 67], ordered: true, range: [60, 72] },
  },
  {
    id: "rh-warmup", lvl: 1, title: "Five-Finger Warm-Up", xp: 20, kind: "find",
    concept: {
      big: "Up 1-2-3-4-5, then back down 5-4-3-2-1.",
      body: "Rest your right hand in C position, thumb on middle C. Play up to G one finger at a time, then walk all the way back down to C. Same five keys, no jumping around.",
      points: ["Up: C D E F G", "Down: G F E D C", "One finger per key, the hand stays put"],
    },
    find: { prompt: "Play up C-D-E-F-G, then back down to C", targets: [60, 62, 64, 65, 67, 65, 64, 62, 60], ordered: true, range: [60, 72] },
  },
  {
    id: "steady-beat", lvl: 1, title: "The Steady Beat", xp: 25, kind: "rhythm",
    concept: {
      big: "Music has a heartbeat. Yours has to match it.",
      body: "A quarter note gets one beat. Listen to the click, then tap along \u2014 space bar, or any key. Being in time matters far more than being fast.",
      points: ["Quarter note = 1 beat", "Count out loud: 1 - 2 - 3 - 4", "Steady always beats fast"],
    },
    rhythm: { bpm: 72, beats: 16 },
  },
  { id: "song-hotcross", lvl: 1, title: "Hot Cross Buns", xp: 40, kind: "song", song: "hotCross" },
  {
    id: "treble-staff", lvl: 1, title: "Reading the Treble Staff", xp: 30, kind: "read",
    concept: {
      big: "Five lines, four spaces, one curly clef.",
      body: "The treble clef is your right hand's home. Middle C hangs just below the staff on its own little line. Read the note, then find it on the keys.",
      points: ["Middle C sits on a short ledger line below the staff", "Going up the staff = going right on the piano", "Line, space, line, space \u2014 they alternate: C D E F G"],
    },
    read: { clef: "treble", pool: [60, 62, 64, 65, 67], rounds: 8, range: [60, 72] },
  },
  { id: "song-mary", lvl: 1, title: "Mary Had a Little Lamb", xp: 40, kind: "song", song: "mary" },
  { id: "song-auclair", lvl: 1, title: "Au Clair de la Lune", xp: 45, kind: "song", song: "auclair" },
  {
    id: "note-values", lvl: 1, title: "Half Notes & Whole Notes", xp: 25, kind: "concept",
    concept: {
      big: "Some notes get to hang around longer.",
      body: "A quarter note is 1 beat and it's filled in. A half note is 2 beats and it's hollow. A whole note is 4 beats \u2014 hollow, with no stem at all. The longer the note, the longer you hold the key down.",
      points: ["Quarter = 1 beat (filled, with a stem)", "Half = 2 beats (hollow, with a stem)", "Whole = 4 beats (hollow, no stem)"],
    },
  },
  { id: "song-ode", lvl: 1, title: "Ode to Joy", xp: 50, kind: "song", song: "odeToJoy" },

  /* ===== LEVEL 2 — PLAYER ===== */
  {
    id: "bass-staff", lvl: 2, title: "Reading the Bass Staff", xp: 30, kind: "read",
    concept: {
      big: "The left hand gets a clef of its own.",
      body: "The bass clef's two dots hug the F line. Your left hand lives down here. Same job as before: read it, then play it.",
      points: ["The two dots point at F below middle C", "Left hand C position: pinky (5) on C, thumb (1) on G", "Middle C sits just ABOVE the bass staff"],
    },
    read: { clef: "bass", pool: [48, 50, 52, 53, 55], rounds: 8, range: [48, 60] },
  },
  {
    id: "lh-position", lvl: 2, title: "C Position, Left Hand", xp: 25, kind: "find",
    concept: {
      big: "Left hand now. Pinky on C, thumb on G.",
      body: "Your left hand is a mirror of your right. Put your LEFT pinky (5) on the C below middle C; your thumb (1) lands on G. Play up: C-D-E-F-G.",
      points: ["Left pinky (5) on C, thumb (1) on G", "The same five white keys, one octave lower", "The two hands mirror each other"],
    },
    find: { prompt: "Play C, D, E, F, G with your LEFT hand", targets: [48, 50, 52, 53, 55], ordered: true, range: [48, 60] },
  },
  { id: "song-hotcross-lh", lvl: 2, title: "Hot Cross Buns, Left Hand", xp: 45, kind: "song", song: "hotCrossLeft" },
  {
    id: "hand-shift", lvl: 2, title: "Moving Your Hand", xp: 30, kind: "concept",
    concept: {
      big: "Sometimes a note is out of reach. So move.",
      body: "Not every song fits under five fingers. In Fr\u00E8re Jacques the last phrase drops to a low G \u2014 that one belongs to your LEFT hand's thumb. Two hands, one tune, taking turns.",
      points: ["Left hand C position: 5 on C, 1 on G", "Hands can trade notes back and forth mid-phrase", "Look one measure ahead so the move isn't a surprise"],
    },
  },
  { id: "song-frere", lvl: 2, title: "Fr\u00E8re Jacques", xp: 50, kind: "song", song: "frere" },
  {
    id: "eighth-notes", lvl: 2, title: "Eighth Notes", xp: 30, kind: "rhythm",
    concept: {
      big: "Two notes squeezed into one beat.",
      body: "Eighth notes have a flag, or a beam joining them together. Two of them fit inside a single beat. Count it out: 1-and-2-and-3-and-4-and.",
      points: ["Two eighths = one quarter", "Say \"1 and 2 and\" out loud", "The notes get faster. The pulse does not."],
    },
    rhythm: { bpm: 64, beats: 16, subdiv: 2 },
  },
  {
    id: "sharps-flats", lvl: 2, title: "Sharps, Flats & Naturals", xp: 30, kind: "find",
    concept: {
      big: "The black keys finally get their names.",
      body: "A sharp (\u266F) means the very next key UP \u2014 usually a black one. A flat (\u266D) means the next key DOWN. A natural (\u266E) cancels both. F\u266F and G\u266D are the same key wearing different hats.",
      points: ["\u266F = one key up, to the right", "\u266D = one key down, to the left", "\u266E = back to the plain white key"],
    },
    find: { prompt: "Play F\u266F, then C\u266F, then G\u266F", targets: [66, 61, 68], ordered: true, range: [60, 72] },
  },
  {
    id: "chords-c", lvl: 2, title: "Your First Chord: C", xp: 35, kind: "find",
    concept: {
      big: "Three notes at once. Skip a key between each one.",
      body: "A triad is built by skipping: C \u2014 (skip D) \u2014 E \u2014 (skip F) \u2014 G. Play all three together with left-hand fingers 5, 3 and 1. That's a C major chord.",
      points: ["Skip one white key between each note", "Left hand fingers 5-3-1", "Press all three at exactly the same moment"],
    },
    find: { prompt: "Play the C chord \u2014 C, E and G together", targets: [48, 52, 55], together: true, range: [48, 60] },
  },
  {
    id: "chords-fg", lvl: 2, title: "Chords F and G", xp: 40, kind: "find",
    concept: {
      big: "Three chords is enough for a thousand songs.",
      body: "We'll use shapes that barely move your hand: C = C-E-G. F = C-F-A. G = B-D-G. Your thumb hardly has to travel between them.",
      points: ["C: C E G", "F: C F A", "G: B D G", "Switch slowly first. Speed comes later, on its own."],
    },
    find: { prompt: "Play the F chord \u2014 C, F and A together", targets: [48, 53, 57], together: true, range: [48, 60] },
  },
  { id: "song-firstduet", lvl: 2, title: "Both Hands Warm-Up", xp: 50, kind: "song", song: "firstDuet" },
  { id: "song-twinkle", lvl: 2, title: "Twinkle, Twinkle, Little Star", xp: 60, kind: "song", song: "twinkle" },
  { id: "song-saints", lvl: 2, title: "When the Saints Go Marching In", xp: 55, kind: "song", song: "saints" },
  { id: "song-odeht", lvl: 2, title: "Ode to Joy, Hands Together", xp: 60, kind: "song", song: "odeHT" },
  {
    id: "dynamics", lvl: 2, title: "Loud, Soft & In Between", xp: 25, kind: "concept",
    concept: {
      big: "How hard you press is how loud it sounds.",
      body: "The piano's real name is pianoforte \u2014 \"soft-loud\". Italian words tell you what to do: p = soft, f = loud, mf = medium loud. Playing everything at one volume is the fastest way to sound like a robot.",
      points: ["p = soft, f = loud, mf = medium", "Crescendo = get louder, gradually", "Melody a little louder than the chords underneath it"],
    },
  },
  { id: "song-jingle", lvl: 2, title: "Jingle Bells", xp: 60, kind: "song", song: "jingle" },

  /* ===== LEVEL 3 — VIRTUOSO ===== */
  {
    id: "scales", lvl: 3, title: "The C Major Scale", xp: 45, kind: "concept",
    concept: {
      big: "Your thumb sneaks under. That's the entire trick.",
      body: "Eight notes, five fingers \u2014 the maths doesn't work. So the thumb tucks under the middle finger after E and carries on up. Right hand going up: 1-2-3, then 1-2-3-4-5.",
      points: ["Up: C(1) D(2) E(3) F(1) G(2) A(3) B(4) C(5)", "The thumb passes UNDER after E", "Coming back down, finger 3 crosses OVER the thumb"],
    },
  },
  { id: "song-scale", lvl: 3, title: "C Major Scale Study", xp: 50, kind: "song", song: "scaleStudy" },
  {
    id: "key-signatures", lvl: 3, title: "Key Signatures", xp: 40, kind: "read",
    concept: {
      big: "Sharps at the start mean sharps all the way through.",
      body: "G major has one sharp: F\u266F. F major has one flat: B\u266D. Rather than write that symbol beside every single note, we put it once at the start of the line. It's a standing order.",
      points: ["G major = 1 sharp (F\u266F)", "F major = 1 flat (B\u266D)", "C major = no sharps, no flats. That's why we started there."],
    },
    read: { clef: "treble", pool: [60, 62, 64, 65, 67, 69, 71, 72], rounds: 10, range: [60, 72] },
  },
  {
    id: "minor", lvl: 3, title: "Minor Keys", xp: 40, kind: "find",
    concept: {
      big: "Drop one note and the whole mood changes.",
      body: "A minor is A-C-E. Compare it to C major (C-E-G). Same white keys, completely different feeling. Minor sounds thoughtful, sad, mysterious. Composers reach for it when they want you to feel something.",
      points: ["A minor: A C E", "Minor = lower the middle note of a major chord", "A minor is C major's relative minor \u2014 same notes, different home"],
    },
    find: { prompt: "Play the A minor chord \u2014 A, C and E together", targets: [45, 48, 52], together: true, range: [45, 60] },
  },
  { id: "song-elise", lvl: 3, title: "F\u00FCr Elise", xp: 90, kind: "song", song: "furElise" },
  {
    id: "sight-reading", lvl: 3, title: "Sight-Reading Challenge", xp: 60, kind: "read",
    concept: {
      big: "Read it once. Play it right.",
      body: "Sight-reading is playing music you have never seen before. It is the single most useful skill a pianist owns, and the only way to get it is reps. Both clefs now, everything you've learned.",
      points: ["Look at the shape first, not each separate note", "Steps and skips \u2014 is it moving by 1, or jumping?", "Keep going. Don't stop to fix mistakes."],
    },
    read: { clef: "both", pool: [48, 50, 52, 53, 55, 57, 60, 62, 64, 65, 67, 69, 71, 72], rounds: 12, range: [48, 72] },
  },
  {
    id: "improv", lvl: 3, title: "Improvise the Blues", xp: 70, kind: "improv",
    concept: {
      big: "No wrong notes. Just make something up.",
      body: "The band plays a 12-bar blues in C. The glowing keys are the C blues scale \u2014 every one of them sounds good over every chord. Play them in any order, any rhythm you like. This is composing, live.",
      points: ["C blues scale: C  E\u266D  F  F\u266F  G  B\u266D  C", "Leave gaps. Silence is part of the solo.", "Play an idea, then play it again slightly differently"],
    },
    improv: { scale: [60, 63, 65, 66, 67, 70, 72], range: [48, 72], bpm: 84 },
  },
];

const LEVELS = [
  { n: 1, name: "Rookie", tag: "First notes", color: T.mint },
  { n: 2, name: "Player", tag: "Both hands", color: T.brass },
  { n: 3, name: "Virtuoso", tag: "Real repertoire", color: T.ribbon },
];
const ICON = { concept: "\u{1F4A1}", song: "\u{1F3B5}", read: "\u{1F441}", find: "\u{1F50E}", rhythm: "\u{1F941}", improv: "\u{1F3BA}" };

/* ---------- AUDIO ---------- */
function useAudio() {
  const ctxRef = useRef(null);
  const voices = useRef(new Map());

  const ctx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AC();
      // iPad: without this, the physical silent switch mutes the piano.
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const release = (midi, fast) => {
    const v = voices.current.get(midi);
    if (!v) return;
    voices.current.delete(midi);
    const t = v.ac.currentTime;
    const tail = fast ? 0.05 : 0.26;
    try {
      v.out.gain.cancelScheduledValues(t);
      v.out.gain.setValueAtTime(Math.max(0.0001, v.out.gain.value), t);
      v.out.gain.exponentialRampToValueAtTime(0.0001, t + tail);
      v.oscs.forEach((o) => o.stop(t + tail + 0.04));
    } catch (e) { /* already stopped */ }
  };

  const noteOn = useCallback((midi, vel = 0.8) => {
    const ac = ctx();
    if (voices.current.has(midi)) release(midi, true); // retrigger cleanly
    const t = ac.currentTime;
    const f = freq(midi);
    const out = ac.createGain();
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(Math.min(9000, f * 9), t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.2), t + 1.1);
    filt.Q.value = 0.6;

    const parts = [
      { type: "triangle", mul: 1, g: 0.55 },
      { type: "sine", mul: 2, g: 0.22 },
      { type: "sine", mul: 3, g: 0.09 },
      { type: "sine", mul: 4.01, g: 0.035 },
    ];
    const oscs = parts.map((p) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = p.type;
      o.frequency.value = f * p.mul;
      g.gain.value = p.g;
      o.connect(g).connect(filt);
      o.start(t);
      return o;
    });
    const peak = 0.2 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.006);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.3), t + 0.9);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    filt.connect(out).connect(ac.destination);
    voices.current.set(midi, { oscs, out, ac });
  }, []);

  const noteOff = useCallback((midi) => release(midi, false), []);

  const pluck = useCallback((midi, durMs = 500, vel = 0.7) => {
    noteOn(midi, vel);
    setTimeout(() => release(midi, false), Math.max(90, durMs - 70));
  }, [noteOn]);

  const click = useCallback((accent = false) => {
    const ac = ctx();
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = accent ? 1650 : 1050;
    o.type = "square";
    g.gain.setValueAtTime(accent ? 0.13 : 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + 0.06);
  }, []);

  const now = useCallback(() => ctx().currentTime, []);
  const wake = useCallback(() => { ctx(); }, []);
  return { noteOn, noteOff, pluck, click, now, wake };
}

/* ---------- INPUT: computer keys + Web MIDI ---------- */
const KEYMAP = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67,
  y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75,
  z: 48, x: 50, c: 52, v: 53, b: 55, n: 57, m: 59,
};

const IS_IOS = typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
   (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

function useInput({ onDown, onUp }) {
  const dRef = useRef(onDown), uRef = useRef(onUp);
  dRef.current = onDown; uRef.current = onUp;
  const [midiState, setMidiState] = useState("idle");

  useEffect(() => {
    const held = new Set();
    const kd = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const m = KEYMAP[e.key.toLowerCase()];
      if (m === undefined || held.has(m)) return;
      e.preventDefault();
      held.add(m);
      dRef.current?.(m, 0.8);
    };
    const ku = (e) => {
      const m = KEYMAP[e.key.toLowerCase()];
      if (m === undefined) return;
      held.delete(m);
      uRef.current?.(m);
    };
    const blur = () => { held.forEach((m) => uRef.current?.(m)); held.clear(); };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const connectMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) { setMidiState(IS_IOS ? "ios" : "unsupported"); return; }
    try {
      const access = await navigator.requestMIDIAccess();
      const hook = () => {
        const inputs = [...access.inputs.values()];
        setMidiState(inputs.length ? "ok" : "none");
        inputs.forEach((inp) => {
          inp.onmidimessage = (msg) => {
            const [st, note, vel] = msg.data;
            const cmd = st & 0xf0;
            if (cmd === 0x90 && vel > 0) dRef.current?.(note, Math.max(0.25, vel / 127));
            else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) uRef.current?.(note);
          };
        });
      };
      hook();
      access.onstatechange = hook;
    } catch (e) { setMidiState("denied"); }
  }, []);

  return { midiState, connectMidi };
}

/* ---------- PROGRESS ---------- */
const EMPTY = { xp: 0, lessons: {}, badges: [], streak: 0, lastDay: null };
const BADGES = {
  firstNote: { icon: "\u{1F3B9}", name: "First Note", desc: "You played your very first note" },
  firstSong: { icon: "\u{1F3B5}", name: "First Song", desc: "Finished a whole song" },
  threeStar: { icon: "\u2B50", name: "Perfectionist", desc: "Earned 3 stars on a song" },
  flawless: { icon: "\u{1F48E}", name: "Flawless", desc: "100% accuracy in Perform mode" },
  level2: { icon: "\u{1F948}", name: "Player", desc: "Cleared every Level 1 lesson" },
  level3: { icon: "\u{1F947}", name: "Virtuoso", desc: "Cleared every Level 2 lesson" },
  scaleMaster: { icon: "\u{1FA9C}", name: "Scale Master", desc: "Nailed the C major scale" },
  improviser: { icon: "\u{1F3BA}", name: "Improviser", desc: "Made up your own blues solo" },
  streak3: { icon: "\u{1F525}", name: "On a Roll", desc: "Practised 3 days in a row" },
};

function useProgress() {
  const [p, setP] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pq:progress");
      if (raw) setP({ ...EMPTY, ...JSON.parse(raw) });
    } catch (e) { /* first run, or private browsing */ }
    setLoaded(true);
  }, []);

  const persist = (next) => {
    try { localStorage.setItem("pq:progress", JSON.stringify(next)); }
    catch (e) { /* private browsing: this session only */ }
  };

  const complete = useCallback((lessonId, stars, acc) => {
    setP((prev) => {
      const lsn = LESSONS.find((l) => l.id === lessonId);
      const old = prev.lessons[lessonId];
      const best = Math.max(old?.stars || 0, stars);
      const bestAcc = Math.max(old?.acc || 0, acc || 0);
      const gained = old ? Math.round((lsn?.xp || 20) * 0.25) : (lsn?.xp || 20);

      const badges = new Set(prev.badges);
      badges.add("firstNote");
      if (lsn?.kind === "song") badges.add("firstSong");
      if (stars >= 3 && lsn?.kind === "song") badges.add("threeStar");
      if (acc >= 100 && lsn?.kind === "song") badges.add("flawless");
      if (lessonId === "song-scale" && stars >= 2) badges.add("scaleMaster");
      if (lessonId === "improv") badges.add("improviser");

      const today = new Date().toDateString();
      const yday = new Date(Date.now() - 864e5).toDateString();
      let streak = prev.streak, lastDay = prev.lastDay;
      if (lastDay !== today) {
        streak = lastDay === yday ? streak + 1 : 1;
        lastDay = today;
      }
      if (streak >= 3) badges.add("streak3");

      const lessons = { ...prev.lessons, [lessonId]: { stars: best, acc: bestAcc, done: true } };
      const doneIds = Object.keys(lessons);
      if (LESSONS.filter((l) => l.lvl === 1).every((l) => doneIds.includes(l.id))) badges.add("level2");
      if (LESSONS.filter((l) => l.lvl === 2).every((l) => doneIds.includes(l.id))) badges.add("level3");

      const next = { xp: prev.xp + gained, lessons, badges: [...badges], streak, lastDay };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => { setP(EMPTY); persist(EMPTY); }, []);
  return { p, loaded, complete, reset };
}

function unlockedSet(p) {
  const s = new Set();
  for (let i = 0; i < LESSONS.length; i++) {
    if (i === 0 || p.lessons[LESSONS[i - 1].id]?.done) s.add(LESSONS[i].id);
    else break;
  }
  Object.keys(p.lessons).forEach((id) => s.add(id));
  return s;
}

/* ---------- KEYBOARD GEOMETRY ---------- */
function useKeyLayout(lo, hi) {
  return useMemo(() => {
    const keys = [];
    let whites = 0;
    for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites++;
    const ww = 100 / whites;
    let wi = 0;
    for (let m = lo; m <= hi; m++) {
      if (!isBlack(m)) { keys.push({ midi: m, black: false, x: wi * ww, w: ww }); wi++; }
      else { const bw = ww * 0.6; keys.push({ midi: m, black: true, x: wi * ww - bw / 2, w: bw }); }
    }
    return { keys, ww, whites };
  }, [lo, hi]);
}

function Piano({ lo, hi, pressed, targets = {}, labels, press, release, height = 150 }) {
  const { keys } = useKeyLayout(lo, hi);
  const held = useRef(new Set());
  const tintColor = (t) => (t === "L" ? LH : t === "R" ? RH : T.mint);

  const bind = (m) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      held.current.add(m); press?.(m, 0.8);
    },
    onPointerUp: (e) => { e.preventDefault(); if (held.current.delete(m)) release?.(m); },
    onPointerCancel: () => { if (held.current.delete(m)) release?.(m); },
  });

  return (
    <div style={{ position: "relative", width: "100%", height, userSelect: "none", touchAction: "none" }}>
      {keys.filter((k) => !k.black).map((k) => {
        const on = pressed.has(k.midi);
        const t = targets[k.midi];
        return (
          <div key={k.midi} {...bind(k.midi)}
            style={{
              position: "absolute", left: `${k.x}%`, width: `calc(${k.w}% - 2px)`, top: 0, height: "100%",
              borderRadius: "0 0 7px 7px",
              background: on
                ? `linear-gradient(180deg, ${t ? tintColor(t) : T.pink}, ${t ? tintColor(t) : "#d95f9b"})`
                : t
                  ? `linear-gradient(180deg,#fffaf0 0%, ${tintColor(t)}40 75%, ${tintColor(t)}aa 100%)`
                  : "linear-gradient(180deg,#fffdf8,#e9dfd1)",
              boxShadow: on ? "inset 0 4px 12px rgba(0,0,0,.35)" : "0 3px 0 rgba(0,0,0,.4)",
              transform: on ? "translateY(2px)" : "none",
              transition: "transform .04s, background .08s",
              cursor: "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8,
            }}>
            {labels && (
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: on ? "#2b1d0a" : "#93856f", pointerEvents: "none" }}>
                {noteName(k.midi)}{k.midi === 60 ? "\u2022" : ""}
              </span>
            )}
          </div>
        );
      })}
      {keys.filter((k) => k.black).map((k) => {
        const on = pressed.has(k.midi);
        const t = targets[k.midi];
        return (
          <div key={k.midi} {...bind(k.midi)}
            style={{
              position: "absolute", left: `${k.x}%`, width: `${k.w}%`, top: 0, height: "62%",
              borderRadius: "0 0 5px 5px", zIndex: 2,
              background: on
                ? `linear-gradient(180deg,${t ? tintColor(t) : T.pink}, ${t ? tintColor(t) : "#c04f86"})`
                : t
                  ? `linear-gradient(180deg,#3a3040, ${tintColor(t)})`
                  : "linear-gradient(180deg,#3b3346,#15101d)",
              boxShadow: on ? "inset 0 3px 8px rgba(0,0,0,.6)" : "0 3px 0 rgba(0,0,0,.5)",
              transform: on ? "translateY(2px)" : "none",
              transition: "transform .04s, background .08s", cursor: "pointer",
            }} />
        );
      })}
    </div>
  );
}

/* ---------- STAFF ---------- */
function Staff({ notes, clef = "treble", width = 300, showNames = false, highlight = -1 }) {
  const S = 11, padTop = 46, padBot = 46;
  const H = padTop + S * 4 + padBot;
  const bottom = padTop + S * 4;
  const ref = clef === "bass" ? BASS_BOTTOM : TREBLE_BOTTOM;
  const list = (Array.isArray(notes) ? notes : [notes]).filter((x) => x != null);
  const step = width / (list.length + 1);
  const yOf = (m) => bottom - (diaStep(m) - ref) * (S / 2);

  const ledgers = (m, x) => {
    const st = diaStep(m), out = [];
    for (let s = ref - 2; s >= st; s -= 2) out.push(s);
    for (let s = ref + 10; s <= st; s += 2) out.push(s);
    return out.map((s, i) => (
      <line key={i} x1={x - 13} x2={x + 13} y1={bottom - (s - ref) * (S / 2)} y2={bottom - (s - ref) * (S / 2)}
        stroke={T.muted} strokeWidth="1.4" />
    ));
  };

  return (
    <svg viewBox={`0 0 ${width} ${H}`} width="100%" style={{ maxHeight: H + 8, display: "block" }}
      role="img" aria-label={`${clef} clef`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="8" x2={width - 8} y1={padTop + i * S} y2={padTop + i * S} stroke={T.line} strokeWidth="1.3" />
      ))}
      <text x="13" y={clef === "bass" ? padTop + S * 2.7 : padTop + S * 4.4}
        fontSize={clef === "bass" ? 34 : 54} fill={T.brass}
        style={{ fontFamily: "'Segoe UI Symbol','Apple Symbols','Noto Music',serif" }}>
        {clef === "bass" ? "\u{1D122}" : "\u{1D11E}"}
      </text>
      {list.map((nt, i) => {
        const m = typeof nt === "number" ? nt : nt.m;
        const x = 62 + i * step;
        const y = yOf(m);
        const hot = i === highlight;
        const c = hot ? T.brass : T.ivory;
        const up = y > padTop + S * 2;
        return (
          <g key={i}>
            {ledgers(m, x)}
            {isBlack(m) && <text x={x - 27} y={y + 6} fontSize="19" fill={c}
              style={{ fontFamily: "'Segoe UI Symbol','Apple Symbols',serif" }}>{"\u266F"}</text>}
            <ellipse cx={x} cy={y} rx="7.5" ry="5.6" fill={c} transform={`rotate(-18 ${x} ${y})`} />
            <line x1={up ? x + 7 : x - 7} x2={up ? x + 7 : x - 7} y1={y} y2={up ? y - 34 : y + 34} stroke={c} strokeWidth="1.7" />
            {showNames && (
              <text x={x} y={H - 12} textAnchor="middle" fontSize="12" fill={T.muted}
                style={{ fontFamily: "'DM Mono',monospace" }}>{noteName(m)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- NOTE HIGHWAY ---------- */
function Highway({ notes, beat, lo, hi, hits, ts = 4, height = 230, pxPerBeat = 62 }) {
  const { keys } = useKeyLayout(lo, hi);
  const posOf = (m) => keys.find((k) => k.midi === m);
  const hitLine = height - 8;

  const bars = [];
  const first = Math.floor(beat / ts) * ts;
  for (let b = first; b < beat + height / pxPerBeat + ts; b += ts) {
    const y = hitLine - (b - beat) * pxPerBeat;
    if (y > -20 && y < height) bars.push({ b, y });
  }

  return (
    <div style={{
      position: "relative", width: "100%", height, overflow: "hidden",
      background: `linear-gradient(180deg, ${T.ink} 0%, ${T.velvet} 80%, #16111f 100%)`,
      borderRadius: "12px 12px 0 0", border: `1px solid ${T.line}`, borderBottom: "none",
    }}>
      {keys.filter((k) => !k.black).map((k) => (
        <div key={k.midi} style={{ position: "absolute", left: `${k.x + k.w}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,.035)" }} />
      ))}
      {bars.map((bl) => (
        <div key={bl.b} style={{ position: "absolute", left: 0, right: 0, top: bl.y, height: 1, background: "rgba(255,255,255,.12)" }} />
      ))}
      {notes.map((nt, i) => {
        const h = Math.max(11, nt.d * pxPerBeat - 4);
        const y = hitLine - (nt.b - beat) * pxPerBeat - h;
        if (y > height + 60 || y + h < -120) return null;
        const k = posOf(nt.m);
        if (!k) return null;
        const state = hits.get(nt.b + ":" + nt.m);
        const base = nt.h === "L" ? LH : RH;
        const col = state === "hit" ? T.mint : state === "miss" ? "#5c4a58" : base;
        const live = !state && Math.abs(nt.b - beat) < 0.3;
        return (
          <div key={i} style={{
            position: "absolute", left: `${k.x + k.w * 0.12}%`, width: `${k.w * 0.76}%`,
            top: y, height: h, borderRadius: 5,
            background: state === "miss" ? col : `linear-gradient(180deg, ${col}dd, ${col})`,
            boxShadow: state === "hit" ? `0 0 18px ${T.mint}cc` : live ? `0 0 22px ${col}` : `0 0 10px ${col}55`,
            opacity: state === "miss" ? 0.35 : 1,
            border: nt.m % 12 === 0 ? "1px solid rgba(255,255,255,.45)" : "none",
          }} />
        );
      })}
      <div style={{
        position: "absolute", left: 0, right: 0, top: hitLine, height: 3,
        background: `linear-gradient(90deg, transparent, ${T.ivory}, transparent)`,
        boxShadow: `0 0 16px ${T.ivory}80`,
      }} />
    </div>
  );
}

/* ---------- UI BITS ---------- */
const Btn = ({ children, onClick, variant = "primary", disabled, style }) => {
  const v = {
    primary: { bg: T.pink, fg: "#3a0d1e", sh: "#b45683" },
    pink: { bg: T.ribbon, fg: "#3a0d1e", sh: "#a13358" },
    dark: { bg: T.raised, fg: T.ivory, sh: "#211630" },
    ghost: { bg: "transparent", fg: T.ivory, sh: "transparent" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        fontFamily: "'Baloo 2',system-ui", fontWeight: 700, fontSize: 15,
        padding: "11px 20px", borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
        background: v.bg, color: v.fg,
        border: variant === "ghost" ? `1.5px solid ${T.line}` : "none",
        boxShadow: variant === "ghost" ? "none" : `0 3px 0 ${v.sh}`,
        opacity: disabled ? 0.4 : 1, ...style,
      }}>{children}</button>
  );
};

const Stars = ({ n: count, size = 15 }) => (
  <span style={{ letterSpacing: 1, fontSize: size, lineHeight: 1 }}>
    {[1, 2, 3].map((i) => <span key={i} style={{ color: i <= count ? T.brass : "#4a3a5e" }}>{"\u2605"}</span>)}
  </span>
);

const Card = ({ children, style }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: 18, ...style }}>{children}</div>
);

const BackLink = ({ onExit }) => (
  <button onClick={onExit} style={{
    background: "none", border: "none", color: T.muted, cursor: "pointer",
    fontFamily: "'Nunito Sans',sans-serif", fontSize: 13, padding: 0, marginBottom: 8,
  }}>{"\u2190"} Back to the map</button>
);

function ConceptBlock({ lesson, onExit, expanded }) {
  const [open, setOpen] = useState(!!expanded);
  const c = lesson.concept;
  return (
    <div style={{ marginBottom: 16 }}>
      <BackLink onExit={onExit} />
      <h2 style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 26, color: T.ivory, margin: "0 0 2px" }}>{lesson.title}</h2>
      {c && (
        <>
          <div style={{
            fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 19, color: T.brass,
            borderLeft: `3px solid ${T.brass}`, paddingLeft: 12, margin: "12px 0",
          }}>{c.big}</div>
          {open ? (
            <>
              <p style={{ color: T.ivory, opacity: .85, fontFamily: "'Nunito Sans'", fontSize: 15, lineHeight: 1.6, margin: "0 0 12px" }}>{c.body}</p>
              {c.points && (
                <ul style={{ margin: "0 0 14px", padding: 0, listStyle: "none" }}>
                  {c.points.map((pt, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, marginBottom: 6, color: T.ivory, opacity: .8, fontFamily: "'Nunito Sans'", fontSize: 14 }}>
                      <span style={{ color: T.mint }}>{"\u25B8"}</span>{pt}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <button onClick={() => setOpen(true)} style={{
              background: "none", border: `1px solid ${T.line}`, borderRadius: 8, color: T.muted,
              padding: "6px 12px", cursor: "pointer", fontFamily: "'Nunito Sans'", fontSize: 13, marginBottom: 12,
            }}>Read the lesson</button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- SONG PLAYER ---------- */
function SongPlayer({ lesson, audio, pressed, press, release, register, onComplete, onExit }) {
  const song = SONGS[lesson.song];
  const [lo, hi] = song.range;
  const [mode, setMode] = useState("practice");
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-4);
  const [hits, setHits] = useState(new Map());
  const [waiting, setWaiting] = useState(null);
  const [result, setResult] = useState(null);
  const [labels, setLabels] = useState(true);

  const startRef = useRef(0), rafRef = useRef(0);
  const hitsRef = useRef(new Map()), waitRef = useRef(null);
  const lastClick = useRef(-99), played = useRef(new Set());
  const modeRef = useRef(mode); modeRef.current = mode;

  const total = song.notes.length;
  const endBeat = useMemo(() => Math.max(...song.notes.map((x) => x.b + x.d)) + 2, [song]);
  const spb = 60 / song.bpm;

  const groups = useMemo(() => {
    const g = new Map();
    song.notes.forEach((x) => {
      if (!g.has(x.b)) g.set(x.b, []);
      g.get(x.b).push(x);
    });
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [song]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    hitsRef.current = new Map();
    waitRef.current = null;
    played.current = new Set();
    lastClick.current = -99;
    setHits(new Map()); setWaiting(null); setBeat(-4); setRunning(false); setResult(null);
  }, []);

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    waitRef.current = null; setWaiting(null);
    const hit = [...hitsRef.current.values()].filter((v) => v === "hit").length;
    const m = modeRef.current;
    if (m === "listen") { setResult({ kind: "listen" }); return; }
    if (m === "practice") {
      setResult({ kind: "practice", hit, total });
      onComplete(1, 60); // getting through it counts. Stars come from Perform.
      return;
    }
    const acc = total ? Math.round((hit / total) * 100) : 0;
    const stars = acc >= 95 ? 3 : acc >= 80 ? 2 : acc >= 55 ? 1 : 0;
    setResult({ kind: "perform", acc, stars, hit, total });
    if (stars >= 1) onComplete(stars, acc);
  }, [total, onComplete]);

  useEffect(() => {
    if (!running) return;
    const loop = () => {
      let b = waitRef.current ? waitRef.current.beat : (audio.now() - startRef.current) / spb - 4;

      if (b < 0) {
        const cb = Math.floor(b);
        if (cb !== lastClick.current) { lastClick.current = cb; audio.click(cb === -4); }
      }

      if (modeRef.current === "listen" && b >= 0) {
        let changed = false;
        song.notes.forEach((x) => {
          const key = x.b + ":" + x.m;
          if (!played.current.has(key) && b >= x.b) {
            played.current.add(key);
            audio.pluck(x.m, x.d * spb * 1000, 0.75);
            hitsRef.current.set(key, "hit");
            changed = true;
          }
        });
        if (changed) setHits(new Map(hitsRef.current));
      }

      if (modeRef.current === "perform" && b >= 0) {
        let changed = false;
        song.notes.forEach((x) => {
          const key = x.b + ":" + x.m;
          if (!hitsRef.current.has(key) && b > x.b + 0.42) { hitsRef.current.set(key, "miss"); changed = true; }
        });
        if (changed) setHits(new Map(hitsRef.current));
      }

      if (modeRef.current === "practice" && b >= 0 && !waitRef.current) {
        const g = groups.find(([gb, arr]) => gb <= b + 0.02 && arr.some((x) => !hitsRef.current.has(x.b + ":" + x.m)));
        if (g) {
          const w = { beat: g[0], need: new Set(g[1].map((x) => x.m)) };
          waitRef.current = w;
          setWaiting(new Set(w.need));
          b = g[0];
        }
      }

      setBeat(b);
      if (b > endBeat) { finish(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, song, groups, endBeat, spb, audio, finish]);

  const onNote = useCallback((m) => {
    if (!running || modeRef.current === "listen") return;

    if (modeRef.current === "practice") {
      const w = waitRef.current;
      if (!w || !w.need.has(m)) return;
      hitsRef.current.set(w.beat + ":" + m, "hit");
      w.need.delete(m);
      setHits(new Map(hitsRef.current));
      if (w.need.size === 0) {
        const resume = w.beat + 0.002;
        waitRef.current = null;
        setWaiting(null);
        startRef.current = audio.now() - (resume + 4) * spb;
      } else {
        setWaiting(new Set(w.need));
      }
      return;
    }

    const b = (audio.now() - startRef.current) / spb - 4;
    let best = null, bestD = 0.45;
    song.notes.forEach((x) => {
      if (x.m !== m || hitsRef.current.has(x.b + ":" + x.m)) return;
      const d = Math.abs(x.b - b);
      if (d < bestD) { bestD = d; best = x; }
    });
    if (best) {
      hitsRef.current.set(best.b + ":" + best.m, "hit");
      setHits(new Map(hitsRef.current));
    }
  }, [running, song, spb, audio]);

  useEffect(() => { register.current = onNote; }, [onNote, register]);

  const start = () => { audio.wake(); reset(); startRef.current = audio.now(); setRunning(true); };

  const targets = useMemo(() => {
    const t = {};
    if (mode === "practice" && waiting) {
      waiting.forEach((m) => {
        const nt = song.notes.find((x) => x.m === m && x.b === waitRef.current?.beat);
        t[m] = nt?.h || "R";
      });
    } else if (running) {
      song.notes.forEach((x) => {
        if (Math.abs(x.b - beat) < 0.18 && hitsRef.current.get(x.b + ":" + x.m) !== "hit") t[x.m] = x.h;
      });
    }
    return t;
  }, [mode, waiting, running, beat, song, hits]);

  const upcoming = useMemo(() =>
    song.notes.filter((x) => x.h === "R" && x.b >= beat - 0.5).sort((a, b) => a.b - b.b).slice(0, 8).map((x) => x.m),
    [song, beat]);

  const hitCount = [...hits.values()].filter((v) => v === "hit").length;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <BackLink onExit={onExit} />
        <h2 style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 27, color: T.ivory, margin: 0 }}>{song.title}</h2>
        <p style={{ color: T.muted, fontFamily: "'Nunito Sans'", fontSize: 14, margin: "4px 0 0" }}>{song.blurb}</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { k: "listen", label: "1 \u00B7 Listen", hint: "The app plays it for you" },
          { k: "practice", label: "2 \u00B7 Practice", hint: "It waits for every note" },
          { k: "perform", label: "3 \u00B7 Perform", hint: "Play in time. Scored." },
        ].map((m) => (
          <button key={m.k} onClick={() => { setMode(m.k); reset(); }}
            style={{
              flex: "1 1 150px", textAlign: "left", padding: "9px 13px", borderRadius: 11, cursor: "pointer",
              background: mode === m.k ? T.raised : "transparent",
              border: `1.5px solid ${mode === m.k ? T.brass : T.line}`,
            }}>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 14, color: mode === m.k ? T.brass : T.ivory }}>{m.label}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: "'Nunito Sans'" }}>{m.hint}</div>
          </button>
        ))}
      </div>

      <Highway notes={song.notes} beat={beat} lo={lo} hi={hi} hits={hits} ts={song.ts}
        height={230} pxPerBeat={song.bpm > 100 ? 54 : 66} />
      <Piano lo={lo} hi={hi} pressed={pressed} targets={targets} labels={labels}
        press={press} release={release} height={hi - lo > 20 ? 150 : 180} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        {!running
          ? <Btn onClick={start}>{result ? "Play it again" : "Start"}</Btn>
          : <Btn variant="dark" onClick={reset}>Stop</Btn>}
        <Btn variant="ghost" onClick={() => setLabels((v) => !v)}>{labels ? "Hide note names" : "Show note names"}</Btn>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center", fontFamily: "'DM Mono',monospace", fontSize: 13, color: T.muted }}>
          <span><span style={{ color: RH }}>{"\u25A0"}</span> right</span>
          {song.hands === "B" && <span><span style={{ color: LH }}>{"\u25A0"}</span> left</span>}
          <span style={{ color: T.ivory }}>{hitCount}/{total}</span>
        </div>
      </div>

      {running && waiting && (
        <div style={{ marginTop: 12, color: T.mint, fontFamily: "'Baloo 2'", fontWeight: 700 }}>
          Waiting for you. Play the glowing key{waiting.size > 1 ? "s \u2014 all at once" : ""}.
        </div>
      )}

      {result && <ResultCard result={result} onRetry={start} onExit={onExit} />}

      <Card style={{ marginTop: 18, background: T.velvet }}>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 4 }}>
          COMING UP {"\u00B7"} RIGHT HAND
        </div>
        <Staff notes={upcoming} clef="treble" width={340} showNames />
      </Card>
    </div>
  );
}

function ResultCard({ result, onRetry, onExit }) {
  const { kind } = result;
  const headline = kind === "listen" ? "That's how it goes."
    : kind === "practice" ? "You played every note."
      : `${result.acc}% accurate`;
  const sub = kind === "listen" ? "Now switch to Practice and play it yourself."
    : kind === "practice" ? "Lesson cleared. Try Perform mode to earn your stars."
      : result.stars === 3 ? "Perfect. That is performance-ready."
        : result.stars === 2 ? "Solid. One more clean pass and it's yours."
          : result.stars === 1 ? "You got through it. Now tidy it up."
            : "Not yet. Go back to Practice mode and slow it down.";
  return (
    <Card style={{ marginTop: 16, borderColor: T.brass, background: T.raised }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          {kind === "perform" && <Stars n={result.stars} size={26} />}
          <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 20, color: T.ivory, marginTop: 4 }}>{headline}</div>
          <div style={{ color: T.muted, fontSize: 13, fontFamily: "'Nunito Sans'" }}>{sub}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Btn variant="dark" onClick={onRetry}>Again</Btn>
          <Btn onClick={onExit}>Done</Btn>
        </div>
      </div>
    </Card>
  );
}

/* ---------- NOTE READING DRILL ---------- */
function ReadDrill({ lesson, pressed, press, release, register, onComplete, onExit }) {
  const cfg = lesson.read;
  const [lo, hi] = cfg.range;
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(null);
  const [clef, setClef] = useState(cfg.clef === "both" ? "treble" : cfg.clef);
  const [right, setRight] = useState(0);
  const [flash, setFlash] = useState(null);
  const [done, setDone] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (round >= cfg.rounds) { setDone(true); return; }
    let c = cfg.clef, pool = cfg.pool;
    if (cfg.clef === "both") {
      c = Math.random() < 0.5 ? "treble" : "bass";
      const filtered = cfg.pool.filter((m) => (c === "bass" ? m < 60 : m >= 60));
      if (filtered.length) pool = filtered;
    }
    setClef(c);
    setTarget(pool[Math.floor(Math.random() * pool.length)]);
    lock.current = false;
  }, [round, cfg]);

  const onNote = useCallback((m) => {
    if (done || lock.current || target === null) return;
    if (m === target) {
      lock.current = true;
      setFlash("right");
      setRight((r) => r + 1);
      setTimeout(() => { setFlash(null); setRound((r) => r + 1); }, 400);
    } else {
      setFlash("wrong");
      setTimeout(() => setFlash(null), 360);
    }
  }, [done, target]);

  useEffect(() => { register.current = onNote; }, [onNote, register]);

  const acc = Math.round((right / cfg.rounds) * 100);
  const stars = acc >= 95 ? 3 : acc >= 75 ? 2 : 1;
  useEffect(() => { if (done) onComplete(stars, acc); }, [done]); // eslint-disable-line

  return (
    <div>
      <ConceptBlock lesson={lesson} onExit={onExit} />
      <Card style={{
        textAlign: "center",
        background: flash === "right" ? "#1e4438" : flash === "wrong" ? "#4a2333" : T.panel,
        borderColor: flash === "right" ? T.mint : flash === "wrong" ? T.danger : T.line,
      }}>
        {!done ? (
          <>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.muted, letterSpacing: 2 }}>
              NOTE {round + 1} OF {cfg.rounds} {"\u00B7"} {clef.toUpperCase()} CLEF
            </div>
            <div style={{ maxWidth: 240, margin: "4px auto 0" }}>
              {target !== null && <Staff notes={[target]} clef={clef} width={190} />}
            </div>
            <div style={{ color: flash === "wrong" ? T.danger : T.muted, fontFamily: "'Nunito Sans'", fontSize: 14, minHeight: 22 }}>
              {flash === "wrong" ? "Not that one. Look again." : flash === "right" ? "Yes." : "Find it on the keys."}
            </div>
          </>
        ) : (
          <div style={{ padding: "18px 0" }}>
            <Stars n={stars} size={30} />
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 24, color: T.ivory, marginTop: 6 }}>
              {right} of {cfg.rounds} right
            </div>
            <Btn onClick={onExit} style={{ marginTop: 14 }}>Back to the map</Btn>
          </div>
        )}
      </Card>
      {!done && (
        <div style={{ marginTop: 14 }}>
          <Piano lo={lo} hi={hi} pressed={pressed} labels press={press} release={release}
            height={hi - lo > 20 ? 150 : 180} />
        </div>
      )}
    </div>
  );
}

/* ---------- KEY-FINDING DRILL ---------- */
function FindDrill({ lesson, pressed, press, release, register, onComplete, onExit }) {
  const cfg = lesson.find;
  const [lo, hi] = cfg.range;
  const [got, setGot] = useState([]);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);

  const recent = useRef([]);

  // chords: all target keys held down at once (keyboard / MIDI / multi-touch)
  useEffect(() => {
    if (!cfg.together || done) return;
    if (cfg.targets.every((t) => pressed.has(t))) { setGot(cfg.targets); setDone(true); }
  }, [pressed, cfg, done]);

  const onNote = useCallback((m) => {
    if (done) return;
    if (cfg.together) {
      // a mouse can only click one key at a time, so also accept the three
      // notes if they all land inside a 1.2 second window
      const t = Date.now();
      recent.current = [...recent.current.filter((r) => t - r.t < 1200), { m, t }];
      const have = new Set(recent.current.map((r) => r.m));
      if (cfg.targets.every((x) => have.has(x))) { setGot(cfg.targets); setDone(true); }
      return;
    }
    if (cfg.ordered) {
      setGot((g) => {
        if (m === cfg.targets[g.length]) {
          const ng = [...g, m];
          if (ng.length === cfg.targets.length) setDone(true);
          return ng;
        }
        setWrong((w) => w + 1);
        return g;
      });
      return;
    }
    setGot((g) => {
      if (cfg.targets.includes(m) && !g.includes(m)) {
        const ng = [...g, m];
        if (ng.length === cfg.targets.length) setDone(true);
        return ng;
      }
      if (!cfg.targets.includes(m)) setWrong((w) => w + 1);
      return g;
    });
  }, [cfg, done]);

  useEffect(() => { register.current = onNote; }, [onNote, register]);

  const stars = cfg.together ? 3 : wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
  useEffect(() => { if (done) onComplete(stars, Math.max(50, 100 - wrong * 10)); }, [done]); // eslint-disable-line

  const targets = {};
  if (!done) {
    const remaining = cfg.together ? cfg.targets
      : cfg.ordered ? [cfg.targets[got.length]]
        : cfg.targets.filter((m) => !got.includes(m));
    remaining.forEach((m) => { if (m !== undefined) targets[m] = "hint"; });
  }
  got.forEach((m) => { targets[m] = "R"; });

  return (
    <div>
      <ConceptBlock lesson={lesson} onExit={onExit} />
      <Card style={{ textAlign: "center", borderColor: done ? T.mint : T.line }}>
        {!done ? (
          <>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 21, color: T.ivory }}>{cfg.prompt}</div>
            <div style={{ color: T.muted, fontSize: 13, fontFamily: "'Nunito Sans'", marginTop: 4 }}>
              {cfg.together ? "Hold all three down at the same time."
                : `${got.length} of ${cfg.targets.length} found`}
              {wrong > 0 && !cfg.together && <span style={{ color: T.danger }}> {"\u00B7"} {wrong} wrong so far</span>}
            </div>
          </>
        ) : (
          <div style={{ padding: "8px 0" }}>
            <Stars n={stars} size={28} />
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 22, color: T.ivory, marginTop: 6 }}>Found them all.</div>
            <Btn onClick={onExit} style={{ marginTop: 12 }}>Back to the map</Btn>
          </div>
        )}
      </Card>
      <div style={{ marginTop: 14 }}>
        <Piano lo={lo} hi={hi} pressed={pressed} targets={targets} labels
          press={press} release={release} height={hi - lo > 24 ? 150 : 180} />
      </div>
    </div>
  );
}

/* ---------- RHYTHM DRILL ---------- */
function RhythmDrill({ lesson, audio, register, onComplete, onExit }) {
  const cfg = lesson.rhythm;
  const sub = cfg.subdiv || 1;
  const total = cfg.beats * sub;
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-4);
  const [taps, setTaps] = useState([]);
  const [done, setDone] = useState(false);
  const startRef = useRef(0), rafRef = useRef(0);
  const lastWhole = useRef(-99), lastSub = useRef(-99), tapsRef = useRef([]);
  const runRef = useRef(false); runRef.current = running;

  const start = () => {
    audio.wake();
    tapsRef.current = []; setTaps([]); setDone(false);
    lastWhole.current = -99; lastSub.current = -99;
    startRef.current = audio.now();
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    const spb = 60 / cfg.bpm;
    const loop = () => {
      const b = (audio.now() - startRef.current) / spb - 4;
      if (b < 0) {
        const wb = Math.floor(b);
        if (wb !== lastWhole.current) { lastWhole.current = wb; audio.click(true); }
      } else if (b < cfg.beats) {
        const sb = Math.floor(b * sub);
        if (sb !== lastSub.current) { lastSub.current = sb; audio.click(sb % (4 * sub) === 0); }
      }
      setBeat(b);
      if (b > cfg.beats + 0.4) {
        cancelAnimationFrame(rafRef.current);
        setRunning(false); setDone(true);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, cfg, sub, audio]);

  const tap = useCallback(() => {
    if (!runRef.current) return;
    const spb = 60 / cfg.bpm;
    const b = (audio.now() - startRef.current) / spb - 4;
    if (b < -0.25 || b > cfg.beats) return;
    const nearest = Math.round(b * sub) / sub;
    const err = Math.abs(b - nearest);
    const grade = err < 0.08 ? "perfect" : err < 0.18 ? "good" : "off";
    tapsRef.current = [...tapsRef.current, { grade }];
    setTaps([...tapsRef.current]);
  }, [cfg, sub, audio]);

  useEffect(() => { register.current = () => tap(); }, [tap, register]);
  useEffect(() => {
    const sp = (e) => { if (e.code === "Space") { e.preventDefault(); tap(); } };
    window.addEventListener("keydown", sp);
    return () => window.removeEventListener("keydown", sp);
  }, [tap]);

  const perfect = taps.filter((t) => t.grade === "perfect").length;
  const good = taps.filter((t) => t.grade === "good").length;
  const score = Math.min(100, Math.round(((perfect + good * 0.6) / total) * 100));
  const stars = score >= 85 ? 3 : score >= 55 ? 2 : 1;
  useEffect(() => { if (done) onComplete(stars, score); }, [done]); // eslint-disable-line

  const pulse = running && beat >= 0 && ((beat * sub) % 1) < 0.2;
  const countLabel = beat < 0 ? Math.max(1, 5 + Math.floor(beat)) : (Math.floor(beat) % 4) + 1;

  return (
    <div>
      <ConceptBlock lesson={lesson} onExit={onExit} />
      {/* The whole drill card is a tap target: on iPad there is no space bar,
         so she taps the beat with a finger. Space bar still works on desktop. */}
      <div
        onPointerDown={running ? (e) => { e.preventDefault(); tap(); } : undefined}
        style={{ touchAction: "manipulation", cursor: running ? "pointer" : "default" }}
      >
      <Card style={{ textAlign: "center" }}>
        <div style={{
          width: 130, height: 130, borderRadius: "50%", margin: "6px auto 16px",
          background: pulse ? T.brass : T.raised,
          border: `3px solid ${pulse ? T.brass : T.line}`,
          boxShadow: pulse ? `0 0 40px ${T.brass}70` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 42,
          color: pulse ? "#241804" : T.muted,
        }}>{running ? countLabel : "\u266A"}</div>

        <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", minHeight: 18, marginBottom: 14 }}>
          {taps.map((t, i) => (
            <span key={i} style={{
              width: 12, height: 12, borderRadius: 3,
              background: t.grade === "perfect" ? T.mint : t.grade === "good" ? T.brass : T.danger,
            }} />
          ))}
        </div>

        {!running && !done && <Btn onClick={start}>Start the metronome</Btn>}
        {running && (
          <div style={{ color: T.mint, fontFamily: "'Baloo 2'", fontWeight: 700 }}>
            {beat < 0 ? "Counting you in\u2026" : `Tap anywhere on every ${sub === 2 ? "half-beat" : "beat"}`}
          </div>
        )}
        {done && (
          <div>
            <Stars n={stars} size={28} />
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 22, color: T.ivory, marginTop: 6 }}>{score}% in time</div>
            <div style={{ color: T.muted, fontSize: 13, marginTop: 2, fontFamily: "'Nunito Sans'" }}>
              {perfect} dead on {"\u00B7"} {good} close {"\u00B7"} {taps.length - perfect - good} off
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
              <Btn variant="dark" onClick={start}>Again</Btn>
              <Btn onClick={onExit}>Back to the map</Btn>
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

/* ---------- BLUES IMPROV ---------- */
const PROG = [48, 48, 48, 48, 53, 53, 48, 48, 55, 53, 48, 55];
function ImprovJam({ lesson, audio, pressed, press, release, register, onComplete, onExit }) {
  const cfg = lesson.improv;
  const [lo, hi] = cfg.range;
  const [running, setRunning] = useState(false);
  const [bar, setBar] = useState(-1);
  const [count, setCount] = useState(0);
  const rafRef = useRef(0), startRef = useRef(0), lastBar = useRef(-1);
  const runRef = useRef(false); runRef.current = running;

  const stop = useCallback(() => { cancelAnimationFrame(rafRef.current); setRunning(false); setBar(-1); }, []);

  const start = () => {
    audio.wake();
    setCount(0); lastBar.current = -1;
    startRef.current = audio.now();
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    const spb = 60 / cfg.bpm;
    const loop = () => {
      const b = (audio.now() - startRef.current) / spb;
      const idx = Math.floor(b / 4);
      if (idx !== lastBar.current) {
        lastBar.current = idx;
        const root = PROG[idx % 12];
        [root, root + 4, root + 7, root + 10].forEach((m, i) => {
          setTimeout(() => audio.pluck(m - 12, spb * 3200, 0.3), i * 14);
        });
        setBar(idx % 12);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, cfg, audio]);

  const onNote = useCallback(() => { if (runRef.current) setCount((v) => v + 1); }, []);
  useEffect(() => { register.current = onNote; return () => cancelAnimationFrame(rafRef.current); }, [onNote, register]);

  const targets = {};
  cfg.scale.forEach((m) => { targets[m] = "hint"; });
  const enough = count >= 20;

  return (
    <div>
      <ConceptBlock lesson={lesson} onExit={onExit} />
      <Card style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 14 }}>
          {PROG.map((r, i) => (
            <div key={i} style={{
              flex: 1, height: 34, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
              background: bar === i ? T.brass : T.raised,
              color: bar === i ? "#241804" : T.muted,
              fontFamily: "'DM Mono',monospace", fontSize: 11,
            }}>{r === 48 ? "C7" : r === 53 ? "F7" : "G7"}</div>
          ))}
        </div>
        {!running ? <Btn onClick={start}>Start the band</Btn> : (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <Btn variant="dark" onClick={stop}>Stop the band</Btn>
            <span style={{ color: T.muted, fontFamily: "'DM Mono',monospace", fontSize: 13 }}>{count} notes played</span>
            <Btn variant="pink" disabled={!enough} onClick={() => { stop(); onComplete(3, 100); onExit(); }}>
              {enough ? "Finish the solo" : `Play ${20 - count} more`}
            </Btn>
          </div>
        )}
      </Card>
      <Piano lo={lo} hi={hi} pressed={pressed} targets={targets} labels
        press={press} release={release} height={160} />
      <div style={{ marginTop: 10, color: T.muted, fontSize: 13, fontFamily: "'Nunito Sans'" }}>
        The glowing keys are the C blues scale. There is no wrong note in there.
      </div>
    </div>
  );
}

/* ---------- CONCEPT LESSON ---------- */
function ConceptLesson({ lesson, pressed, press, release, register, onComplete, onExit }) {
  useEffect(() => { register.current = () => {}; }, [register]);
  return (
    <div>
      <ConceptBlock lesson={lesson} onExit={onExit} expanded />
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 10 }}>
          TRY IT OUT {"\u00B7"} NOTHING IS BEING SCORED
        </div>
        <Piano lo={60} hi={72} pressed={pressed} labels press={press} release={release} height={180} />
      </Card>
      <Btn onClick={() => { onComplete(3, 100); onExit(); }}>Got it {"\u2014"} mark as learned</Btn>
    </div>
  );
}

/* ---------- LESSON MAP ---------- */
function LessonMap({ p, unlocked, onPick, onFreePlay }) {
  const nextId = LESSONS.find((l) => !p.lessons[l.id]?.done)?.id;
  return (
    <div>
      {LEVELS.map((lvl) => {
        const items = LESSONS.filter((l) => l.lvl === lvl.n);
        const doneCt = items.filter((l) => p.lessons[l.id]?.done).length;
        return (
          <section key={lvl.n} style={{ marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: lvl.color, letterSpacing: 2 }}>LEVEL {lvl.n}</span>
              <h2 style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 23, color: T.ivory, margin: 0 }}>{lvl.name}</h2>
              <span style={{ color: T.muted, fontSize: 13, fontFamily: "'Nunito Sans'" }}>{lvl.tag}</span>
              <span style={{ marginLeft: "auto", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.muted }}>{doneCt}/{items.length}</span>
            </div>

            <div style={{ position: "relative", padding: "22px 0 8px" }}>
              {/* the staff behind the lessons */}
              <div style={{ position: "absolute", left: 0, right: 0, top: 34, display: "flex", flexDirection: "column", gap: 9, pointerEvents: "none" }}>
                {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ height: 1, background: T.line, opacity: .55 }} />)}
              </div>
              <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: "44px 16px", alignItems: "center" }}>
                {items.map((l, i) => {
                  const st = p.lessons[l.id];
                  const open = unlocked.has(l.id);
                  const isNext = l.id === nextId;
                  const lift = [0, -12, 8, -6, 12, -3][i % 6];
                  return (
                    <button key={l.id} disabled={!open} onClick={() => onPick(l)} title={l.title}
                      style={{
                        position: "relative", transform: `translateY(${lift}px)`,
                        width: 56, height: 56, borderRadius: "50%", flex: "0 0 auto", padding: 0,
                        cursor: open ? "pointer" : "not-allowed",
                        background: st?.done ? lvl.color : open ? T.raised : T.velvet,
                        border: `2px solid ${st?.done ? lvl.color : isNext ? T.ivory : T.line}`,
                        boxShadow: isNext ? `0 0 0 4px ${T.ivory}22, 0 0 22px ${lvl.color}66`
                          : st?.done ? `0 0 14px ${lvl.color}55` : "none",
                        color: st?.done ? "#1B1327" : open ? T.ivory : "#5b4c70",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      }}>
                      <span style={{ fontSize: 16, lineHeight: 1, opacity: open ? 1 : .35 }}>{ICON[l.kind]}</span>
                      {st?.done && <span style={{ marginTop: 2 }}><Stars n={st.stars} size={9} /></span>}
                      <span style={{
                        position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)",
                        width: 86, fontSize: 10, lineHeight: 1.25, textAlign: "center",
                        color: open ? T.muted : "#5b4c70", fontFamily: "'Nunito Sans'", fontWeight: 600,
                      }}>{l.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <Card style={{ background: T.velvet, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, color: T.ivory }}>Free Play</div>
          <div style={{ color: T.muted, fontSize: 13, fontFamily: "'Nunito Sans'" }}>Full keyboard, no rules, no scoring.</div>
        </div>
        <Btn variant="ghost" style={{ marginLeft: "auto" }} onClick={onFreePlay}>Open the piano</Btn>
      </Card>
    </div>
  );
}

/* ---------- FREE PLAY ---------- */
function FreePlay({ audio, pressed, press, release, register, onExit }) {
  const [labels, setLabels] = useState(true);
  const [metro, setMetro] = useState(false);
  const [bpm, setBpm] = useState(90);
  const rafRef = useRef(0), startRef = useRef(0), lastRef = useRef(-1);

  useEffect(() => { register.current = () => {}; }, [register]);

  useEffect(() => {
    if (!metro) return;
    audio.wake();
    startRef.current = audio.now();
    lastRef.current = -1;
    const loop = () => {
      const b = (audio.now() - startRef.current) / (60 / bpm);
      const cb = Math.floor(b);
      if (cb !== lastRef.current) { lastRef.current = cb; audio.click(cb % 4 === 0); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [metro, bpm, audio]);

  return (
    <div>
      <BackLink onExit={onExit} />
      <h2 style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 26, color: T.ivory, margin: "0 0 14px" }}>Free Play</h2>
      <Piano lo={48} hi={84} pressed={pressed} labels={labels} press={press} release={release} height={180} />
      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={() => setLabels((v) => !v)}>{labels ? "Hide note names" : "Show note names"}</Btn>
        <Btn variant={metro ? "primary" : "ghost"} onClick={() => setMetro((v) => !v)}>{metro ? "Stop metronome" : "Metronome"}</Btn>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: T.muted, fontFamily: "'DM Mono',monospace", fontSize: 13 }}>
          {bpm} bpm
          <input type="range" min="50" max="160" value={bpm} onChange={(e) => setBpm(+e.target.value)}
            style={{ accentColor: T.brass, width: 120 }} />
        </label>
      </div>
    </div>
  );
}

/* ---------- TROPHIES ---------- */
function Trophies({ p, onExit, onReset }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div>
      <BackLink onExit={onExit} />
      <h2 style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 26, margin: "0 0 16px", color: T.ivory }}>Trophies</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(148px,1fr))", gap: 12, marginBottom: 26 }}>
        {Object.entries(BADGES).map(([k, b]) => {
          const got = p.badges.includes(k);
          return (
            <div key={k} style={{
              background: got ? T.raised : T.velvet,
              border: `1px solid ${got ? T.brass : T.line}`,
              borderRadius: 14, padding: 14, textAlign: "center", opacity: got ? 1 : .45,
            }}>
              <div style={{ fontSize: 26, filter: got ? "none" : "grayscale(1)" }}>{b.icon}</div>
              <div style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 14, marginTop: 4, color: T.ivory }}>{b.name}</div>
              <div style={{ color: T.muted, fontSize: 11, marginTop: 2, fontFamily: "'Nunito Sans'" }}>{b.desc}</div>
            </div>
          );
        })}
      </div>
      {!confirm
        ? <Btn variant="ghost" onClick={() => setConfirm(true)}>Reset all progress</Btn>
        : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: T.muted, fontSize: 13, fontFamily: "'Nunito Sans'" }}>This erases every star and trophy.</span>
            <Btn variant="pink" onClick={() => { onReset(); setConfirm(false); }}>Erase it all</Btn>
            <Btn variant="ghost" onClick={() => setConfirm(false)}>Keep it</Btn>
          </div>
        )}
    </div>
  );
}

const Pill = ({ icon, label }) => (
  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontFamily: "'DM Mono',monospace", fontSize: 13, color: T.ivory }}>
    <span>{icon}</span>{label}
  </span>
);

/* ---------- APP ---------- */
export default function PianoQuest() {
  const audio = useAudio();
  const { p, loaded, complete, reset } = useProgress();
  const [view, setView] = useState({ name: "map" });
  const [pressed, setPressed] = useState(new Set());
  const [toast, setToast] = useState(null);
  const register = useRef(() => {});

  const press = useCallback((m, v = 0.8) => {
    setPressed((s) => { const n2 = new Set(s); n2.add(m); return n2; });
    audio.noteOn(m, v);
    register.current?.(m);
  }, [audio]);

  const release = useCallback((m) => {
    setPressed((s) => { const n2 = new Set(s); n2.delete(m); return n2; });
    audio.noteOff(m);
  }, [audio]);

  const { midiState, connectMidi } = useInput({ onDown: press, onUp: release });

  const unlocked = useMemo(() => unlockedSet(p), [p]);
  const doneCount = Object.values(p.lessons).filter((x) => x.done).length;
  const totalXp = useMemo(() => LESSONS.reduce((s, l) => s + l.xp, 0), []);

  const handleComplete = useCallback((id) => (stars, acc) => {
    complete(id, stars, acc);
    setToast({ stars, xp: LESSONS.find((l) => l.id === id)?.xp || 0 });
    setTimeout(() => setToast(null), 2400);
  }, [complete]);

  const back = () => { register.current = () => {}; setView({ name: "map" }); };
  const lesson = view.lesson;
  const Engine = lesson && {
    song: SongPlayer, read: ReadDrill, find: FindDrill,
    rhythm: RhythmDrill, improv: ImprovJam, concept: ConceptLesson,
  }[lesson.kind];

  const shared = { audio, pressed, press, release, register };

  // iPad Safari won't make a sound until audio is started inside a real
  // touch. One tap on the way in, and it's live for the whole session.
  const [awake, setAwake] = useState(false);
  useEffect(() => {
    if (awake) return;
    const go = () => { audio.wake(); setAwake(true); };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
  }, [awake, audio]);

  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.ink, color: T.ivory, fontFamily: "'Nunito Sans',system-ui,sans-serif" }}>
      <style>{FONTS}{`
        *{box-sizing:border-box}
        button:focus-visible{outline:2px solid ${T.ivory};outline-offset:2px}
        html,body{overscroll-behavior:none;-webkit-text-size-adjust:100%}
        button,div{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}
        @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
      `}</style>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 20px 70px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontFamily: "'Poppins','Baloo 2',system-ui,sans-serif", fontWeight: 800, fontSize: 24, color: T.pink, letterSpacing: 0.5, lineHeight: 1.05 }}>Ané {"\u{1F380}"}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.brass, letterSpacing: 3, marginTop: 2 }}>PIANO QUEST</div>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 15, color: T.muted }}>
              {doneCount === 0 ? "Start at the first note." : `${doneCount} of ${LESSONS.length} lessons cleared`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {p.streak > 1 && <Pill icon={"\u{1F525}"} label={`${p.streak}-day streak`} />}
            <Pill icon={"\u26A1"} label={`${p.xp} XP`} />
            <button onClick={() => setView({ name: "trophies" })} style={{
              background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: "7px 12px",
              color: T.ivory, cursor: "pointer", fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 13,
            }}>{"\u{1F3C6}"} {p.badges.length}</button>
          </div>
        </header>

        <div style={{ height: 6, background: T.velvet, borderRadius: 3, marginBottom: 24, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${Math.min(100, (p.xp / totalXp) * 100)}%`,
            background: `linear-gradient(90deg,${T.mint},${T.brass},${T.ribbon})`, transition: "width .5s",
          }} />
        </div>

        {view.name === "map" && midiState !== "ok" && !IS_IOS && (
          <Card style={{ marginBottom: 22, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: T.velvet }}>
            <span style={{ fontSize: 22 }}>{"\u{1F3B9}"}</span>
            <div style={{ flex: 1, minWidth: 210 }}>
              <div style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 15 }}>Got a real keyboard?</div>
              <div style={{ color: T.muted, fontSize: 13 }}>
                {midiState === "none" ? "No MIDI device found. Plug one in over USB, then connect again."
                  : midiState === "denied" ? "MIDI access was blocked. Allow it in your browser settings."
                    : midiState === "unsupported" ? "This browser has no Web MIDI. Try Chrome or Edge on a computer."
                      : "Plug a MIDI keyboard in over USB and she can play the real thing. Chrome or Edge."}
              </div>
            </div>
            <Btn variant="ghost" onClick={connectMidi}>Connect MIDI keyboard</Btn>
          </Card>
        )}
        {view.name === "map" && midiState === "ok" && (
          <div style={{ marginBottom: 18, color: T.mint, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            {"\u25CF"} MIDI keyboard connected
          </div>
        )}

        {!loaded ? (
          <div style={{ color: T.muted, padding: 50, textAlign: "center" }}>Loading her progress…</div>
        ) : view.name === "map" ? (
          <LessonMap p={p} unlocked={unlocked} onPick={(l) => { audio.wake(); setView({ name: "lesson", lesson: l }); }}
            onFreePlay={() => setView({ name: "free" })} />
        ) : view.name === "free" ? (
          <FreePlay {...shared} onExit={back} />
        ) : view.name === "trophies" ? (
          <Trophies p={p} onExit={back} onReset={reset} />
        ) : Engine ? (
          <Engine key={lesson.id} lesson={lesson} {...shared}
            onComplete={handleComplete(lesson.id)} onExit={back} />
        ) : null}

        {(view.name === "lesson" || view.name === "free") && (
          <div style={{ marginTop: 22, color: "#6f6088", fontSize: 12, fontFamily: "'DM Mono',monospace", lineHeight: 1.7 }}>
            No piano handy? Right hand: A S D F G H J K (white) {"\u00B7"} W E T Y U (black) {"\u00B7"} Left hand: Z X C V B N M
          </div>
        )}
      </div>

      {portrait && (view.name === "lesson" || view.name === "free") && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(58,19,41,.97)", zIndex: 80,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 14, padding: 30, textAlign: "center",
        }}>
          <div style={{ fontSize: 52 }}>{"\u{1F504}"}</div>
          <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 24, color: T.ivory }}>Turn the iPad sideways</div>
          <div style={{ color: T.muted, fontSize: 15, maxWidth: 320 }}>
            The piano needs the wide screen. Two hands don't fit in portrait.
          </div>
        </div>
      )}

      {!awake && (
        <div onPointerDown={() => { audio.wake(); setAwake(true); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(58,19,41,.94)", zIndex: 90,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 12, cursor: "pointer", textAlign: "center", padding: 30,
          }}>
          <div style={{ fontFamily: "'Poppins','Baloo 2',system-ui,sans-serif", fontWeight: 800, fontSize: 68, color: T.pink, letterSpacing: 1, lineHeight: 1 }}>Ané {"\u{1F380}"}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.brass, letterSpacing: 4 }}>PIANO QUEST</div>
          <div style={{ fontSize: 56 }}>{"\u{1F3B9}"}</div>
          <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 26, color: T.ivory }}>Tap anywhere to begin</div>
          <div style={{ color: T.muted, fontSize: 14, maxWidth: 340 }}>
            If you hear nothing, check the side switch isn't on silent and the volume is up.
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed", left: "50%", bottom: 26, transform: "translateX(-50%)",
          background: T.raised, border: `1.5px solid ${T.brass}`, borderRadius: 14,
          padding: "12px 20px", display: "flex", gap: 12, alignItems: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,.5)", zIndex: 50,
        }}>
          <Stars n={toast.stars} size={18} />
          <span style={{ fontFamily: "'Baloo 2'", fontWeight: 800, color: T.ivory }}>+{toast.xp} XP</span>
        </div>
      )}
    </div>
  );
}
