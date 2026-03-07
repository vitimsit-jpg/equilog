'use client';

// FlightComparator.jsx
// Dependencies: react, tailwindcss, lucide-react
// Usage: <FlightComparator /> — aucune prop requise

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plane, Clock, MapPin, Users, Star, X, ChevronDown, ChevronUp,
  Search, Calendar, SlidersHorizontal, Check, ArrowRight,
  BarChart3, Award, Filter, ArrowUpDown, RefreshCw, Zap, Shield,
} from 'lucide-react';

// ─── DONNÉES ──────────────────────────────────────────────────────────────────

const AIRLINES = [
  { name: 'Air France',         emoji: '🇫🇷', code: 'AF', rating: 4.2 },
  { name: 'Lufthansa',          emoji: '🛫', code: 'LH', rating: 4.3 },
  { name: 'Emirates',           emoji: '🌟', code: 'EK', rating: 4.8 },
  { name: 'British Airways',    emoji: '🎩', code: 'BA', rating: 4.1 },
  { name: 'KLM',                emoji: '💙', code: 'KL', rating: 4.2 },
  { name: 'Swiss',              emoji: '⛰️',  code: 'LX', rating: 4.5 },
  { name: 'Iberia',             emoji: '🌞', code: 'IB', rating: 3.9 },
  { name: 'Turkish Airlines',   emoji: '🌙', code: 'TK', rating: 4.0 },
  { name: 'Qatar Airways',      emoji: '⭐', code: 'QR', rating: 4.9 },
  { name: 'Singapore Airlines', emoji: '🌸', code: 'SQ', rating: 4.9 },
  { name: 'easyJet',            emoji: '🟠', code: 'U2', rating: 3.4 },
  { name: 'Ryanair',            emoji: '💛', code: 'FR', rating: 3.1 },
  { name: 'Vueling',            emoji: '🌈', code: 'VY', rating: 3.6 },
  { name: 'Transavia',          emoji: '🟢', code: 'HV', rating: 3.7 },
  { name: 'Air Canada',         emoji: '🍁', code: 'AC', rating: 4.0 },
  { name: 'Delta',              emoji: '🔺', code: 'DL', rating: 4.1 },
];

const COMPARATORS = [
  { name: 'Skyscanner',    bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    border: 'border-cyan-500/40'    },
  { name: 'Google Flights',bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/40'    },
  { name: 'Kayak',         bg: 'bg-orange-500/20',  text: 'text-orange-400',  border: 'border-orange-500/40'  },
  { name: 'Momondo',       bg: 'bg-purple-500/20',  text: 'text-purple-400',  border: 'border-purple-500/40'  },
  { name: 'Expedia',       bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  border: 'border-yellow-500/40'  },
  { name: 'Booking.com',   bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  border: 'border-indigo-500/40'  },
];

const AIRPORTS = [
  'Paris (CDG)', 'London (LHR)', 'New York (JFK)', 'Dubai (DXB)',
  'Tokyo (NRT)', 'Amsterdam (AMS)', 'Frankfurt (FRA)', 'Barcelona (BCN)',
  'Rome (FCO)', 'Madrid (MAD)', 'Lisbon (LIS)', 'Berlin (BER)',
  'Zurich (ZRH)', 'Singapore (SIN)', 'Hong Kong (HKG)', 'Bangkok (BKK)',
  'Sydney (SYD)', 'Los Angeles (LAX)', 'Miami (MIA)', 'Toronto (YYZ)',
  'Montréal (YUL)', 'Chicago (ORD)', 'Istanbul (IST)', 'Doha (DOH)',
  'Seoul (ICN)', 'Mumbai (BOM)', 'Cairo (CAI)', 'Casablanca (CMN)',
];

const LAYOVER_CITIES = [
  'Frankfurt (FRA)', 'Amsterdam (AMS)', 'Istanbul (IST)',
  'Dubai (DXB)', 'London (LHR)', 'Zurich (ZRH)',
  'Doha (DOH)', 'Singapore (SIN)', 'Paris (CDG)',
];

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

const seeded = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };

const fmt = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

const fmtDuration = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? String(m).padStart(2, '0') : '00'}`;
};

const addMin = (h, m, dur) => {
  const total = h * 60 + m + dur;
  return { h: Math.floor(total / 60) % 24, m: total % 60, overflow: Math.floor(total / 1440) };
};

const calcScore = ({ price, duration, stops, airline }) => {
  const ps = Math.max(0, 100 - price * 0.05);
  const ds = Math.max(0, 100 - duration * 0.08);
  const ss = stops === 0 ? 100 : stops === 1 ? 58 : 20;
  const as = (airline.rating / 5) * 100;
  return Math.round(ps * 0.38 + ds * 0.28 + ss * 0.22 + as * 0.12);
};

const LOW_COST = new Set(['easyJet', 'Ryanair', 'Vueling', 'Transavia']);
const PREMIUM   = new Set(['Emirates', 'Qatar Airways', 'Singapore Airlines', 'Swiss']);

const generateFlights = (from, to, date, pax, cabin) => {
  const base = [...(from + to + date)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (i, off = 0) => seeded(base + i * 137 + off);

  const count = 10 + Math.floor(r(0) * 8);
  const flights = [];

  for (let i = 0; i < count; i++) {
    const airline     = AIRLINES[Math.floor(r(i, 1) * AIRLINES.length)];
    const comparator  = COMPARATORS[Math.floor(r(i, 2) * COMPARATORS.length)];
    const stops       = r(i, 3) < 0.38 ? 0 : r(i, 3) < 0.76 ? 1 : 2;

    const baseEco = LOW_COST.has(airline.name)
      ? 40 + r(i, 4) * 160
      : PREMIUM.has(airline.name)
      ? 160 + r(i, 4) * 240
      : 100 + r(i, 4) * 200;

    const cabinMult  = cabin === 'economy' ? 1 : cabin === 'business' ? 4.5 : 11;
    const stopMult   = stops === 0 ? 1.18 : stops === 1 ? 1 : 0.82;
    const pricePerPax = Math.round(baseEco * cabinMult * stopMult);
    const price       = pricePerPax * pax;

    const baseDur = 80 + Math.floor(r(i, 5) * 700);
    const duration = baseDur + stops * (50 + Math.floor(r(i, 6) * 80));

    const depH = 5 + Math.floor(r(i, 7) * 18);
    const depM = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][Math.floor(r(i, 8) * 12)];
    const arr  = addMin(depH, depM, duration);

    const layovers = stops > 0
      ? Array.from({ length: stops }, (_, si) => ({
          city: LAYOVER_CITIES.filter(c => c !== from && c !== to)[
            Math.floor(r(i, 11 + si) * (LAYOVER_CITIES.length - 2))
          ] || LAYOVER_CITIES[0],
          duration: 55 + Math.floor(r(i, 13 + si) * 130),
        }))
      : [];

    const flight = {
      id: `f-${base}-${i}`,
      airline,
      comparator,
      flightNum: `${airline.code}${100 + Math.floor(r(i, 9) * 900)}`,
      from, to,
      depH, depM,
      arrH: arr.h, arrM: arr.m, overflow: arr.overflow,
      duration, stops, layovers,
      price, pricePerPax, pax, cabin,
      baggage:    !LOW_COST.has(airline.name) || r(i, 14) > 0.7,
      refundable: r(i, 15) > 0.65,
      wifi:       r(i, 16) > 0.5,
      score: 0,
    };
    flight.score = calcScore(flight);
    flights.push(flight);
  }

  return flights.sort((a, b) => a.price - b.price);
};

// ─── COMPOSANTS UTILITAIRES ───────────────────────────────────────────────────

const ComparatorBadge = ({ c }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
    {c.name}
  </span>
);

const ScoreBadge = ({ score }) => {
  const cls = score >= 80
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : score >= 60
    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
    : 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  const lbl = score >= 80 ? 'Top deal' : score >= 60 ? 'Bon rapport' : 'Standard';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {score >= 80 ? '🏆' : score >= 60 ? '✨' : '📋'} {lbl} · {score}
    </span>
  );
};

const Stars = ({ n }) => (
  <div className="flex gap-px">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={9} className={i < Math.floor(n) ? 'text-amber-400 fill-amber-400' : 'text-slate-700 fill-slate-700'} />
    ))}
  </div>
);

// ─── FLIGHT CARD ──────────────────────────────────────────────────────────────

function FlightCard({ flight, idx, isCompared, compareCount, onToggleCompare, isBest }) {
  const [open, setOpen] = useState(false);
  const dep = fmt(flight.depH, flight.depM);
  const arr = fmt(flight.arrH, flight.arrM);

  return (
    <div
      className={`
        group relative bg-slate-900/90 backdrop-blur border rounded-2xl overflow-hidden
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl
        ${isCompared
          ? 'border-amber-400/50 shadow-amber-500/10 shadow-lg'
          : isBest
          ? 'border-emerald-500/40 shadow-emerald-500/10 shadow-lg'
          : 'border-slate-700/60 hover:border-slate-600/80'}
      `}
      style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
    >
      {isBest && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
      )}
      {isCompared && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      )}

      <div className="p-4 md:p-5">
        {/* Main row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Airline */}
          <div className="flex items-center gap-3 sm:w-40 shrink-0">
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
              {flight.airline.emoji}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{flight.airline.name}</div>
              <div className="text-xs text-slate-500 font-mono">{flight.flightNum}</div>
              <Stars n={flight.airline.rating} />
            </div>
          </div>

          {/* Times + route */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-center shrink-0">
              <div className="text-2xl font-bold tabular-nums text-white">{dep}</div>
              <div className="text-[11px] text-slate-500 truncate max-w-[68px]">{flight.from.split('(')[0].trim()}</div>
            </div>

            <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="text-[11px] text-slate-500">{fmtDuration(flight.duration)}</div>
              <div className="w-full flex items-center gap-1">
                <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-slate-600" />
                <Plane size={13} className="text-cyan-400 shrink-0" />
                <div className="flex-1 h-px bg-gradient-to-r from-slate-600 to-slate-700" />
              </div>
              <div className="text-[11px]">
                {flight.stops === 0
                  ? <span className="text-emerald-400 font-medium">Direct</span>
                  : <span className="text-amber-400">{flight.stops} escale{flight.stops > 1 ? 's' : ''}</span>
                }
              </div>
            </div>

            <div className="text-center shrink-0">
              <div className="text-2xl font-bold tabular-nums text-white">
                {arr}
                {flight.overflow > 0 && <sup className="text-amber-400 text-xs ml-0.5">+{flight.overflow}</sup>}
              </div>
              <div className="text-[11px] text-slate-500 truncate max-w-[68px]">{flight.to.split('(')[0].trim()}</div>
            </div>
          </div>

          {/* Price + badges */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1.5 sm:w-36 shrink-0">
            <div className="text-right">
              {isBest && <div className="text-[10px] text-emerald-400 font-semibold mb-0.5">✓ Meilleur prix</div>}
              <div className="text-2xl font-bold text-white tabular-nums">
                {flight.pricePerPax.toLocaleString('fr-FR')} €
              </div>
              <div className="text-[11px] text-slate-500">
                {flight.pax > 1 ? `×${flight.pax} = ${flight.price.toLocaleString('fr-FR')} €` : 'par personne'}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <ComparatorBadge c={flight.comparator} />
              <ScoreBadge score={flight.score} />
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap gap-3">
            {flight.baggage && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Check size={10} className="text-emerald-400 shrink-0" /> Bagage inclus
              </span>
            )}
            {flight.refundable && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Shield size={10} className="text-emerald-400 shrink-0" /> Remboursable
              </span>
            )}
            {flight.wifi && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Zap size={10} className="text-cyan-400 shrink-0" /> Wi-Fi
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Détails {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            <button
              onClick={() => onToggleCompare(flight)}
              disabled={!isCompared && compareCount >= 3}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                isCompared
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : compareCount >= 3
                  ? 'border-slate-800 text-slate-700 cursor-not-allowed'
                  : 'border-slate-700 text-slate-400 hover:border-amber-500/40 hover:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              {isCompared ? '✓ Sélectionné' : '+ Comparer'}
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {open && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Itinéraire</h5>
              <div className="relative pl-4">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-700" />
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute -left-[11px] top-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900" />
                    <div className="text-xs text-white font-medium">{dep} · {flight.from}</div>
                  </div>
                  {flight.layovers.map((l, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[11px] top-1 w-2 h-2 rounded-full bg-amber-400/60 ring-2 ring-slate-900" />
                      <div className="text-xs text-amber-400/80">Escale: {l.city}</div>
                      <div className="text-[11px] text-slate-500">{fmtDuration(l.duration)} d'attente</div>
                    </div>
                  ))}
                  <div className="relative">
                    <div className="absolute -left-[11px] top-1 w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-slate-900" />
                    <div className="text-xs text-white font-medium">
                      {arr} · {flight.to}
                      {flight.overflow > 0 && <span className="text-amber-400 ml-1">(+{flight.overflow}j)</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Détails tarifaires</h5>
              <div className="space-y-1.5">
                {[
                  ['Classe', flight.cabin === 'economy' ? 'Économique' : flight.cabin === 'business' ? 'Business' : 'Première'],
                  ['Durée totale', fmtDuration(flight.duration)],
                  ['Source', flight.comparator.name],
                  ['Score Q/P', `${flight.score}/100`],
                  ['Note compagnie', `${flight.airline.rating}/5`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-200 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODAL COMPARAISON ────────────────────────────────────────────────────────

function ComparisonModal({ flights, onClose }) {
  const criteria = [
    { label: 'Prix / pers.',    key: 'pricePerPax',    fmt: f => `${f.pricePerPax.toLocaleString('fr-FR')} €`,                    best: 'min' },
    { label: 'Prix total',      key: 'price',          fmt: f => `${f.price.toLocaleString('fr-FR')} €`,                          best: 'min' },
    { label: 'Durée',           key: 'duration',       fmt: f => fmtDuration(f.duration),                                          best: 'min' },
    { label: 'Escales',         key: 'stops',          fmt: f => f.stops === 0 ? 'Direct' : `${f.stops} escale${f.stops>1?'s':''}`, best: 'min' },
    { label: 'Score Q/P',       key: 'score',          fmt: f => `${f.score}/100`,                                                  best: 'max' },
    { label: 'Note compagnie',  key: 'airlineRating',  fmt: f => `${f.airline.rating}/5`,                                          best: 'max' },
    { label: 'Bagage inclus',   key: 'baggage',        fmt: f => f.baggage    ? '✓ Inclus'    : '✗ En option',                    best: 'bool' },
    { label: 'Remboursable',    key: 'refundable',     fmt: f => f.refundable ? '✓ Oui'        : '✗ Non',                         best: 'bool' },
    { label: 'Wi-Fi',           key: 'wifi',           fmt: f => f.wifi       ? '✓ Disponible' : '✗ Non',                         best: 'bool' },
    { label: 'Classe',          key: 'cabin',          fmt: f => f.cabin === 'economy' ? 'Éco' : f.cabin === 'business' ? 'Business' : 'Première', best: 'none' },
  ];

  const getBestVal = (c) => {
    if (c.best === 'bool' || c.best === 'none') return null;
    const vals = flights.map(f => c.key === 'airlineRating' ? f.airline.rating : f[c.key]);
    return c.best === 'min' ? Math.min(...vals) : Math.max(...vals);
  };

  const winner = [...flights].sort((a, b) => b.score - a.score)[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-amber-400" />
            <h3 className="font-bold text-white">Comparaison côte à côte</h3>
            <span className="text-xs text-slate-500">({flights.length} vols)</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5">
          {/* Airline headers */}
          <div
            className="grid gap-3 mb-4"
            style={{ gridTemplateColumns: `140px repeat(${flights.length}, 1fr)` }}
          >
            <div />
            {flights.map(f => (
              <div key={f.id} className="text-center p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <div className="text-2xl mb-1">{f.airline.emoji}</div>
                <div className="text-sm font-bold text-white">{f.airline.name}</div>
                <div className="text-[11px] font-mono text-slate-500 mb-1.5">{f.flightNum}</div>
                <ComparatorBadge c={f.comparator} />
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {criteria.map(c => {
              const bestVal = getBestVal(c);
              return (
                <div
                  key={c.key}
                  className="grid gap-3 items-center"
                  style={{ gridTemplateColumns: `140px repeat(${flights.length}, 1fr)` }}
                >
                  <div className="text-xs font-medium text-slate-400">{c.label}</div>
                  {flights.map(f => {
                    const rawVal = c.key === 'airlineRating' ? f.airline.rating : f[c.key];
                    const isBest = c.best !== 'bool' && c.best !== 'none' && rawVal === bestVal;
                    const isBestBool = c.best === 'bool' && rawVal === true;
                    const highlight = isBest || isBestBool;
                    return (
                      <div
                        key={f.id}
                        className={`text-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                          highlight
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800/60 border border-slate-800 text-slate-300'
                        }`}
                      >
                        {c.fmt(f)}
                        {highlight && <span className="ml-1">✓</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Recommendation */}
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/8 to-orange-500/5 border border-amber-500/25 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Award size={15} className="text-amber-400" />
              <span className="text-sm font-bold text-amber-400">Notre recommandation</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              <span className="text-white font-semibold">{winner.airline.name} {winner.flightNum}</span>{' '}
              offre le meilleur rapport qualité/prix avec un score de{' '}
              <span className="text-cyan-400 font-bold">{winner.score}/100</span>.
              {winner.stops === 0 && ' Vol direct, '}
              {winner.stops === 0 && winner.baggage && 'bagage inclus '}
              — disponible sur{' '}
              <span className={winner.comparator.text}>{winner.comparator.name}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function FlightComparator() {
  // Recherche
  const [from,      setFrom]      = useState('Paris (CDG)');
  const [to,        setTo]        = useState('New York (JFK)');
  const [dateDep,   setDateDep]   = useState('');
  const [dateRet,   setDateRet]   = useState('');
  const [pax,       setPax]       = useState(1);
  const [cabin,     setCabin]     = useState('economy');

  // Résultats
  const [flights,   setFlights]   = useState([]);
  const [searched,  setSearched]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  // Filtres & tri
  const [sortBy,    setSortBy]    = useState('price');
  const [showFilts, setShowFilts] = useState(false);
  const [maxPrice,  setMaxPrice]  = useState(9999);
  const [maxStops,  setMaxStops]  = useState(2);
  const [selAirl,   setSelAirl]   = useState([]);
  const [selComp,   setSelComp]   = useState([]);

  // Comparaison
  const [cmpList,   setCmpList]   = useState([]);
  const [showCmp,   setShowCmp]   = useState(false);

  // Autocomplete
  const [fromSug,   setFromSug]   = useState([]);
  const [toSug,     setToSug]     = useState([]);

  useEffect(() => {
    const d = new Date();
    const dep = new Date(d); dep.setDate(d.getDate() + 18);
    const ret = new Date(dep); ret.setDate(dep.getDate() + 9);
    setDateDep(dep.toISOString().split('T')[0]);
    setDateRet(ret.toISOString().split('T')[0]);
  }, []);

  const handleSearch = useCallback(() => {
    if (!from.trim() || !to.trim() || !dateDep) return;
    setLoading(true);
    setSearched(false);
    setCmpList([]);
    setTimeout(() => {
      const res = generateFlights(from, to, dateDep, pax, cabin);
      setFlights(res);
      setMaxPrice(Math.max(...res.map(f => f.price)));
      setSelAirl([]);
      setSelComp([]);
      setSearched(true);
      setLoading(false);
    }, 1300);
  }, [from, to, dateDep, pax, cabin]);

  const minPrice      = useMemo(() => flights.length ? Math.min(...flights.map(f => f.price)) : 0,    [flights]);
  const ceilPrice     = useMemo(() => flights.length ? Math.max(...flights.map(f => f.price)) : 9999, [flights]);
  const allAirlines   = useMemo(() => [...new Set(flights.map(f => f.airline.name))],  [flights]);
  const allComps      = useMemo(() => [...new Set(flights.map(f => f.comparator.name))],[flights]);

  const filtered = useMemo(() => {
    let res = flights.filter(f =>
      f.price <= maxPrice &&
      f.stops <= maxStops &&
      (selAirl.length === 0 || selAirl.includes(f.airline.name)) &&
      (selComp.length === 0 || selComp.includes(f.comparator.name))
    );
    return res.sort((a, b) =>
      sortBy === 'price'    ? a.price    - b.price    :
      sortBy === 'duration' ? a.duration - b.duration :
      sortBy === 'stops'    ? a.stops    - b.stops    :
                              b.score    - a.score
    );
  }, [flights, maxPrice, maxStops, selAirl, selComp, sortBy]);

  const toggleCmp = useCallback((f) => {
    setCmpList(prev =>
      prev.find(x => x.id === f.id)
        ? prev.filter(x => x.id !== f.id)
        : prev.length >= 3 ? prev : [...prev, f]
    );
  }, []);

  const toggleAirl = useCallback((n) => setSelAirl(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]), []);
  const toggleComp = useCallback((n) => setSelComp(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]), []);
  const swapCities = useCallback(() => { setFrom(to); setTo(from); }, [from, to]);

  const activeFiltCount = selAirl.length + selComp.length + (maxStops < 2 ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Styles globaux + animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { font-family: 'Space Grotesk', system-ui, sans-serif; box-sizing: border-box; }

        .bg-grid {
          background-image:
            linear-gradient(rgba(6,182,212,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,.04) 1px, transparent 1px);
          background-size: 44px 44px;
        }

        @keyframes planeFloat {
          0%,100% { transform: translateY(0) rotate(-12deg); }
          50%      { transform: translateY(-7px) rotate(-12deg); }
        }
        .plane-anim { animation: planeFloat 5s ease-in-out infinite; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp .4s ease-out both; }

        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.04), transparent);
          background-size: 200% 100%;
          animation: shimmer 1.6s linear infinite;
        }

        @keyframes flightTrail {
          0%   { left: -60px; opacity: 0; }
          10%  { opacity: .3; }
          90%  { opacity: .3; }
          100% { left: calc(100% + 60px); opacity: 0; }
        }
        .flight-trail {
          position: absolute;
          animation: flightTrail 8s linear infinite;
        }

        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
        input[type=range]::-webkit-slider-runnable-track {
          height: 4px;
          background: linear-gradient(to right, #0891b2, #06b6d4);
          border-radius: 9999px;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #06b6d4;
          margin-top: -6px;
          border: 2px solid #0f172a;
          box-shadow: 0 0 8px rgba(6,182,212,.5);
        }
        input[type=date] { color-scheme: dark; }
        select { appearance: none; }
      `}</style>

      {/* Décoration de fond */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-cyan-950/30 to-transparent pointer-events-none" />
      <div className="fixed top-32 left-1/3 w-72 h-72 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/3 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Avions en arrière-plan */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        {[
          { top: '15%', delay: '0s',   dur: '12s', size: 14 },
          { top: '55%', delay: '4s',   dur: '16s', size: 10 },
          { top: '78%', delay: '8s',   dur: '14s', size: 12 },
        ].map((p, i) => (
          <div key={i} className="flight-trail" style={{ top: p.top, animationDelay: p.delay, animationDuration: p.dur }}>
            <Plane size={p.size} className="text-cyan-500/30" />
          </div>
        ))}
      </div>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="plane-anim text-cyan-400 shrink-0">
            <Plane size={26} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent leading-none">
              FlightCompare
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wide uppercase">Comparateur multi-sources</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2">
            {COMPARATORS.map(c => (
              <span key={c.name} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text} ${c.border} border`}>
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ─── HERO + FORMULAIRE ──────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-7">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 leading-tight">
              Trouvez le{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                vol idéal
              </span>
            </h2>
            <p className="text-slate-400 text-sm">
              Comparez instantanément sur 6+ plateformes — prix, durée, escales, qualité
            </p>
          </div>

          {/* Carte de recherche */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 md:p-6 shadow-2xl shadow-cyan-950/40">
            {/* Tabs classe */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {[
                { v: 'economy',  l: 'Économique' },
                { v: 'business', l: 'Business'   },
                { v: 'first',    l: 'Première'   },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setCabin(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    cabin === v
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Départ / Arrivée */}
            <div className="grid grid-cols-[1fr,40px,1fr] gap-2 mb-3 items-end">
              {/* Départ */}
              <div className="relative">
                <label className="block text-[11px] text-slate-500 mb-1 ml-1 uppercase tracking-wider">Départ</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/70 pointer-events-none" />
                  <input
                    type="text"
                    value={from}
                    onChange={e => {
                      setFrom(e.target.value);
                      const q = e.target.value.toLowerCase();
                      setFromSug(q.length > 1 ? AIRPORTS.filter(a => a.toLowerCase().includes(q)).slice(0, 5) : []);
                    }}
                    onBlur={() => setTimeout(() => setFromSug([]), 150)}
                    placeholder="Ville de départ"
                    className="w-full bg-slate-800/90 border border-slate-700/70 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/70 focus:bg-slate-800 transition-all"
                  />
                  {fromSug.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-30 shadow-2xl">
                      {fromSug.map(s => (
                        <button key={s} onMouseDown={() => { setFrom(s); setFromSug([]); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2">
                          <MapPin size={11} className="text-slate-500 shrink-0" /> {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Swap */}
              <div className="flex justify-center">
                <button
                  onClick={swapCities}
                  className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-750 flex items-center justify-center transition-all group"
                  title="Inverser"
                >
                  <ArrowRight size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </button>
              </div>

              {/* Arrivée */}
              <div className="relative">
                <label className="block text-[11px] text-slate-500 mb-1 ml-1 uppercase tracking-wider">Arrivée</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/70 pointer-events-none" />
                  <input
                    type="text"
                    value={to}
                    onChange={e => {
                      setTo(e.target.value);
                      const q = e.target.value.toLowerCase();
                      setToSug(q.length > 1 ? AIRPORTS.filter(a => a.toLowerCase().includes(q)).slice(0, 5) : []);
                    }}
                    onBlur={() => setTimeout(() => setToSug([]), 150)}
                    placeholder="Ville d'arrivée"
                    className="w-full bg-slate-800/90 border border-slate-700/70 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:bg-slate-800 transition-all"
                  />
                  {toSug.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-30 shadow-2xl">
                      {toSug.map(s => (
                        <button key={s} onMouseDown={() => { setTo(s); setToSug([]); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2">
                          <MapPin size={11} className="text-slate-500 shrink-0" /> {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dates + passagers + bouton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 ml-1 uppercase tracking-wider">Aller</label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input type="date" value={dateDep} onChange={e => setDateDep(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700/70 rounded-xl pl-9 pr-2 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/70 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 ml-1 uppercase tracking-wider">
                  Retour <span className="normal-case text-slate-600">(optionnel)</span>
                </label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input type="date" value={dateRet} onChange={e => setDateRet(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700/70 rounded-xl pl-9 pr-2 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/70 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 ml-1 uppercase tracking-wider">Passagers</label>
                <div className="relative">
                  <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select value={pax} onChange={e => setPax(Number(e.target.value))}
                    className="w-full bg-slate-800/90 border border-slate-700/70 rounded-xl pl-9 pr-8 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/70 transition-all cursor-pointer">
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} passager{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                  {loading ? 'Recherche...' : 'Rechercher'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SKELETON ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="relative z-10 max-w-6xl mx-auto px-4 pb-8 space-y-3">
          <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
            <RefreshCw size={14} className="animate-spin text-cyan-400" />
            Interrogation de {COMPARATORS.length} comparateurs en cours…
          </div>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shimmer">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-800 rounded-lg w-2/5" />
                  <div className="h-3 bg-slate-800 rounded-lg w-1/4" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-6 bg-slate-800 rounded-lg w-20" />
                  <div className="h-3 bg-slate-800 rounded-lg w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── RÉSULTATS ──────────────────────────────────────────────────────── */}
      {searched && !loading && (
        <section className="relative z-10 max-w-7xl mx-auto px-4 pb-20">
          {/* Barre de contrôle */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                {filtered.length} vol{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
                <span className="font-normal text-slate-500 text-sm ml-2">sur {flights.length} au total</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {from} → {to} · {pax} passager{pax > 1 ? 's' : ''} ·{' '}
                {cabin === 'economy' ? 'Économique' : cabin === 'business' ? 'Business' : 'Première'}
                {dateRet && ' · Aller-retour'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tri */}
              <div className="relative">
                <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                >
                  <option value="price">Prix croissant</option>
                  <option value="duration">Durée</option>
                  <option value="stops">Escales</option>
                  <option value="score">Score global</option>
                </select>
              </div>

              {/* Filtres */}
              <button
                onClick={() => setShowFilts(!showFilts)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                  showFilts || activeFiltCount > 0
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <SlidersHorizontal size={14} />
                Filtres
                {activeFiltCount > 0 && (
                  <span className="bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFiltCount}
                  </span>
                )}
              </button>

              {/* Comparer */}
              {cmpList.length >= 2 && (
                <button
                  onClick={() => setShowCmp(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500/15 border border-amber-500/50 text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-500/25 transition-all"
                >
                  <BarChart3 size={14} />
                  Comparer ({cmpList.length})
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-5">
            {/* Panneau filtres — desktop */}
            {showFilts && (
              <aside className="hidden lg:block w-60 shrink-0 fade-up">
                <div className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-2xl p-4 sticky top-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-200">Filtres</h4>
                    {activeFiltCount > 0 && (
                      <button
                        onClick={() => { setSelAirl([]); setSelComp([]); setMaxStops(2); setMaxPrice(ceilPrice); }}
                        className="text-[11px] text-slate-500 hover:text-cyan-400 transition-colors"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>

                  {/* Prix */}
                  <div className="mb-5">
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 block">
                      Prix max — <span className="text-cyan-400 font-bold">{maxPrice.toLocaleString('fr-FR')} €</span>
                    </label>
                    <input
                      type="range" min={minPrice} max={ceilPrice} step={10}
                      value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                      <span>{minPrice.toLocaleString()} €</span>
                      <span>{ceilPrice.toLocaleString()} €</span>
                    </div>
                  </div>

                  {/* Escales */}
                  <div className="mb-5">
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 block">Escales max</label>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(n => (
                        <button
                          key={n}
                          onClick={() => setMaxStops(n)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            maxStops === n
                              ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                              : 'bg-slate-800 border border-slate-700/60 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {n === 0 ? 'Direct' : n === 1 ? '1 escale' : '2+'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compagnies */}
                  <div className="mb-5">
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 block">Compagnie</label>
                    <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                      {allAirlines.map(name => (
                        <button
                          key={name}
                          onClick={() => toggleAirl(name)}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            selAirl.includes(name) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'
                          }`}>
                            {selAirl.includes(name) && <Check size={10} strokeWidth={3} className="text-white" />}
                          </div>
                          <span className="text-xs text-slate-300 truncate text-left">{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comparateurs */}
                  <div>
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 block">Comparateur</label>
                    <div className="space-y-0.5">
                      {allComps.map(name => {
                        const c = COMPARATORS.find(x => x.name === name);
                        return (
                          <button
                            key={name}
                            onClick={() => toggleComp(name)}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                              selComp.includes(name) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'
                            }`}>
                              {selComp.includes(name) && <Check size={10} strokeWidth={3} className="text-white" />}
                            </div>
                            <span className={`text-xs truncate text-left ${c?.text || 'text-slate-300'}`}>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </aside>
            )}

            {/* Liste vols */}
            <div className="flex-1 min-w-0">
              {/* Filtres mobiles */}
              {showFilts && (
                <div className="lg:hidden bg-slate-900/90 border border-slate-700/60 rounded-2xl p-4 mb-3 fade-up">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-slate-500 mb-1.5 block">
                        Prix max — <span className="text-cyan-400 font-bold">{maxPrice.toLocaleString('fr-FR')} €</span>
                      </label>
                      <input type="range" min={minPrice} max={ceilPrice} step={10}
                        value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 mb-1.5 block">Escales max</label>
                      <div className="flex gap-1">
                        {[0,1,2].map(n => (
                          <button key={n} onClick={() => setMaxStops(n)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              maxStops === n ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border border-slate-700 text-slate-500'
                            }`}>
                            {n === 0 ? 'Direct' : n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-600">
                  <Plane size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="text-lg font-medium text-slate-500">Aucun vol ne correspond</p>
                  <p className="text-sm mt-1">Essayez d'assouplir vos filtres</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((f, idx) => (
                    <div key={f.id} className="fade-up" style={{ animationDelay: `${Math.min(idx * 35, 280)}ms` }}>
                      <FlightCard
                        flight={f}
                        idx={idx}
                        isCompared={cmpList.some(x => x.id === f.id)}
                        compareCount={cmpList.length}
                        onToggleCompare={toggleCmp}
                        isBest={idx === 0 && sortBy === 'price'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── ÉTAT INITIAL ───────────────────────────────────────────────────── */}
      {!searched && !loading && (
        <section className="relative z-10 max-w-4xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {COMPARATORS.map(c => (
              <div key={c.name} className={`${c.bg} border ${c.border} rounded-xl p-4 text-center`}>
                <div className={`text-sm font-bold ${c.text} mb-0.5`}>{c.name}</div>
                <div className="text-[11px] text-slate-500">Comparé en temps réel</div>
              </div>
            ))}
          </div>
          <div className="text-center space-y-2 text-slate-600">
            <Plane size={36} className="mx-auto opacity-20" />
            <p className="text-sm">Renseignez votre destination pour commencer</p>
          </div>
        </section>
      )}

      {/* ─── MODAL COMPARAISON ──────────────────────────────────────────────── */}
      {showCmp && cmpList.length >= 2 && (
        <ComparisonModal flights={cmpList} onClose={() => setShowCmp(false)} />
      )}

      {/* ─── BARRE DE COMPARAISON FLOTTANTE ─────────────────────────────────── */}
      {cmpList.length > 0 && !showCmp && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 fade-up">
          <div className="bg-slate-900/95 backdrop-blur border border-amber-500/30 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl shadow-amber-950/50">
            <div className="flex items-center gap-1.5">
              {cmpList.map(f => (
                <div key={f.id} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-base" title={f.airline.name}>
                  {f.airline.emoji}
                </div>
              ))}
            </div>
            <span className="text-sm text-slate-300">
              <span className="text-amber-400 font-bold">{cmpList.length}</span> vol{cmpList.length > 1 ? 's' : ''} sélectionné{cmpList.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              {cmpList.length >= 2 && (
                <button
                  onClick={() => setShowCmp(true)}
                  className="bg-amber-500/20 border border-amber-500/50 text-amber-400 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition-all"
                >
                  Comparer
                </button>
              )}
              <button
                onClick={() => setCmpList([])}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-white transition-all"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
