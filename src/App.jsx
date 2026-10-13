import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const SAVE_KEY = 'pumpkin-panic-save-v1'
const COSTUMES = [
  { id: 'witch', name: 'Witch hat', icon: '🧙', price: 20, color: 'violet' },
  { id: 'shades', name: 'Cool shades', icon: '🕶️', price: 35, color: 'blue' },
  { id: 'crown', name: 'Tiny crown', icon: '👑', price: 55, color: 'gold' },
  { id: 'stache', name: 'Fancy moustache', icon: '🥸', price: 70, color: 'pink' },
  { id: 'halo', name: 'Ghost halo', icon: '😇', price: 90, color: 'mint' },
  { id: 'cowboy', name: 'Cowboy hat', icon: '🤠', price: 120, color: 'orange' },
]
const ACHIEVEMENTS = [
  { id: 'first-ten', count: 10, title: 'Little squash', description: 'Collect 10 pumpkins', icon: '🌱' },
  { id: 'half-century', count: 50, title: 'Gourd-geous!', description: 'Collect 50 pumpkins', icon: '🎃' },
  { id: 'century', count: 100, title: 'The great pumpkin', description: 'Collect 100 pumpkins', icon: '🏆' },
]
const GARDEN_REACTIONS = [
  'That one had a tiny hat on the inside.',
  'Pumpkin says: “I demand a snack!”',
  'You found its good side. Both sides are good.',
  'A satisfying little bonk. Excellent work.',
  'This pumpkin would like to thank its dentist.',
  'It giggled. Pumpkins do that, apparently.',
]
const PANIC_REACTIONS = [
  'Ghost! Spooky, but not snackable.',
  'That ghost has excellent evasive manners.',
  'Boo! Wrong button, brave pumpkin pal.',
  'The ghost says you owe it one high-five.',
]
const NAMES = ['Sir Squashington', 'Pumpkin Spice', 'Gourd Gordon', 'Count Wobble', 'Lil’ Lantern', 'Professor Seeds', 'Mister Munch', 'Lady Pips']
const TRAITS = ['dramatically brave', 'a little bit crunchy', 'secretly a disco fan', 'allergic to Mondays', 'an excellent listener', 'suspiciously sparkly', 'a professional napper', 'fiercely snack-motivated']
const PERSONALITY_LINES = ['Would absolutely win a staring contest with a scarecrow.', 'Has never met a leaf they did not trust.', 'Keeps emergency pie in a tiny backpack.', 'Thinks every full moon is a personal spotlight.', 'Dreams of becoming a very round astronaut.', 'Once frightened a moth and still talks about it.']
const rand = (max) => Math.floor(Math.random() * max)

function loadSave() {
  const fresh = { coins: 0, pumpkinCount: 0, ownedCostumes: ['none'], equipped: 'none', unlocked: [], bestScore: 0, leaderboard: [], sound: false }
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return fresh
    const saved = JSON.parse(raw)
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return fresh
    const ids = COSTUMES.map((item) => item.id)
    const owned = Array.isArray(saved.ownedCostumes) ? saved.ownedCostumes.filter((id) => id === 'none' || ids.includes(id)) : ['none']
    const board = Array.isArray(saved.leaderboard) ? saved.leaderboard
      .filter((entry) => entry && Number.isFinite(entry.score) && entry.score >= 0 && typeof entry.date === 'string')
      .slice(0, 10) : []
    const pumpkinCount = Number.isSafeInteger(saved.pumpkinCount) && saved.pumpkinCount >= 0 ? saved.pumpkinCount : 0
    return {
      coins: Number.isSafeInteger(saved.coins) && saved.coins >= 0 ? saved.coins : 0,
      pumpkinCount,
      ownedCostumes: [...new Set(['none', ...owned])],
      equipped: owned.includes(saved.equipped) ? saved.equipped : 'none',
      unlocked: ACHIEVEMENTS.filter((item) => Array.isArray(saved.unlocked) && saved.unlocked.includes(item.id) && pumpkinCount >= item.count).map((item) => item.id),
      bestScore: Number.isSafeInteger(saved.bestScore) && saved.bestScore >= 0 ? saved.bestScore : 0,
      leaderboard: board.sort((a, b) => b.score - a.score).slice(0, 10),
      sound: saved.sound === true,
    }
  } catch (error) {
    console.warn('Pumpkin Panic could not read its saved progress; starting fresh.', error)
    return fresh
  }
}

function Pumpkin({ accessory = 'none', className = '' }) {
  const costume = COSTUMES.find((item) => item.id === accessory)
  return (
    <span className={`pumpkin-character ${className}`} role="img" aria-label="Your pumpkin">
      {costume && <span className="pumpkin-accessory" aria-hidden="true">{costume.icon}</span>}
      <span aria-hidden="true">🎃</span>
    </span>
  )
}

function IconButton({ children, onClick, label, className = '' }) {
  return <button type="button" className={`icon-button ${className}`} onClick={onClick} aria-label={label} title={label}>{children}</button>
}

function App() {
  const [save, setSave] = useState(loadSave)
  const [page, setPage] = useState('home')
  const [helpOpen, setHelpOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [personality, setPersonality] = useState(() => makePersonality())
  const [gardenClicks, setGardenClicks] = useState(0)
  const [panicActive, setPanicActive] = useState(false)
  const [panicTime, setPanicTime] = useState(30)
  const [panicScore, setPanicScore] = useState(0)
  const [targets, setTargets] = useState(() => makeTargets(5))
  const scoreRef = useRef(0)
  const timeRef = useRef(30)

  useEffect(() => {
    let notification
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    } catch (error) {
      console.warn('Pumpkin Panic could not save progress to this browser.', error)
      notification = window.setTimeout(() => setNotice('Your browser could not save progress. Check its storage settings.'), 0)
    }
    return () => window.clearTimeout(notification)
  }, [save])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    if (!helpOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setHelpOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [helpOpen])

  const playSound = useCallback((kind = 'pop') => {
    if (!save.sound) return
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) throw new Error('Web Audio is not supported by this browser.')
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = kind === 'ghost' ? 'sine' : 'triangle'
      oscillator.frequency.setValueAtTime(kind === 'ghost' ? 220 : 520, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'ghost' ? 120 : 820, context.currentTime + 0.12)
      gain.gain.setValueAtTime(0.12, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.15)
      oscillator.onended = () => context.close()
    } catch (error) {
      console.warn('Pumpkin Panic sound effect could not be played.', error)
    }
  }, [save.sound])

  const updateSave = useCallback((updater) => {
    setSave((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater
      const newlyUnlocked = ACHIEVEMENTS.filter((achievement) => next.pumpkinCount >= achievement.count && !next.unlocked.includes(achievement.id))
      return newlyUnlocked.length ? { ...next, unlocked: [...next.unlocked, ...newlyUnlocked.map((item) => item.id)] } : next
    })
  }, [])

  function collectPumpkin(amount = 1, coins = 1) {
    const achievement = ACHIEVEMENTS.find((item) => save.pumpkinCount < item.count && save.pumpkinCount + amount >= item.count)
    updateSave((previous) => ({
      ...previous,
      pumpkinCount: previous.pumpkinCount + amount,
      coins: previous.coins + coins,
    }))
    if (achievement) setNotice(`Achievement unlocked: ${achievement.title}!`)
    return achievement
  }

  function clickGardenPumpkin() {
    setGardenClicks((count) => count + 1)
    const bonus = Math.random() < 0.12
    const achievement = collectPumpkin(1, bonus ? 6 : 1)
    playSound()
    setNotice(achievement ? `Achievement unlocked: ${achievement.title}!` : bonus ? 'BONUS pumpkin! +5 coins for your excellent bonking.' : GARDEN_REACTIONS[rand(GARDEN_REACTIONS.length)])
  }

  function startPanic() {
    scoreRef.current = 0
    timeRef.current = 30
    setPanicScore(0)
    setPanicTime(30)
    setTargets(makeTargets(5))
    setPanicActive(true)
    setPage('panic')
  }

  const finishPanic = useCallback((finalScore) => {
    updateSave((previous) => ({
      ...previous,
      coins: previous.coins + finalScore,
      bestScore: Math.max(previous.bestScore, finalScore),
      leaderboard: [...previous.leaderboard, { score: finalScore, date: new Date().toISOString() }]
        .sort((a, b) => b.score - a.score).slice(0, 10),
    }))
    setNotice(`Time! You caught ${finalScore} ${finalScore === 1 ? 'pumpkin' : 'pumpkins'}. ${finalScore ? 'What a squash-buckling run!' : 'The pumpkins got away this time!'}`)
  }, [updateSave])

  useEffect(() => {
    if (!panicActive) return undefined
    const timer = window.setInterval(() => {
      const remaining = timeRef.current - 1
      timeRef.current = remaining
      setPanicTime(remaining)
      if (remaining <= 0) {
        window.clearInterval(timer)
        setPanicActive(false)
        finishPanic(scoreRef.current)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [panicActive, finishPanic])

  useEffect(() => {
    if (!panicActive) return undefined
    const movement = window.setInterval(() => {
      setTargets(makeTargets(5 + Math.min(4, Math.floor(scoreRef.current / 5))))
    }, Math.max(420, 1050 - Math.floor(scoreRef.current / 3) * 60))
    return () => window.clearInterval(movement)
  }, [panicActive, panicScore])

  function clickTarget(target) {
    if (!panicActive) return
    if (target.kind === 'ghost') {
      playSound('ghost')
      setNotice(PANIC_REACTIONS[rand(PANIC_REACTIONS.length)])
      setTargets((previous) => previous.map((item) => item.id === target.id ? makeTarget(item.id) : item))
      return
    }
    scoreRef.current += 1
    setPanicScore((score) => score + 1)
    const achievement = collectPumpkin(1, 1)
    playSound()
    if (achievement) setNotice(`Achievement unlocked: ${achievement.title}!`)
    setTargets((previous) => previous.map((item) => item.id === target.id ? makeTarget(item.id) : item))
  }

  function buyOrEquip(costume) {
    if (save.ownedCostumes.includes(costume.id)) {
      updateSave((previous) => ({ ...previous, equipped: costume.id }))
      setNotice(`${costume.name} equipped. Very fashionable, very round.`)
      return
    }
    if (save.coins < costume.price) {
      setNotice(`You need ${costume.price - save.coins} more coins for ${costume.name}.`)
      return
    }
    updateSave((previous) => ({
      ...previous,
      coins: previous.coins - costume.price,
      ownedCostumes: [...previous.ownedCostumes, costume.id],
      equipped: costume.id,
    }))
    setNotice(`${costume.name} unlocked and equipped!`)
    playSound()
  }

  function toggleSound() {
    updateSave((previous) => ({ ...previous, sound: !previous.sound }))
    setNotice(save.sound ? 'Sound effects off.' : 'Sound effects on. Boop!')
  }

  function resetProgress() {
    if (!window.confirm('Reset all Pumpkin Panic progress, coins, costumes, and scores? This cannot be undone.')) return
    const fresh = { coins: 0, pumpkinCount: 0, ownedCostumes: ['none'], equipped: 'none', unlocked: [], bestScore: 0, leaderboard: [], sound: save.sound }
    setSave(fresh)
    setPanicActive(false)
    timeRef.current = 30
    setPanicTime(30)
    setPanicScore(0)
    scoreRef.current = 0
    setPage('home')
    setNotice('All progress reset. A fresh patch awaits!')
  }

  const navItems = [
    { id: 'home', icon: '⌂', label: 'Home' },
    { id: 'garden', icon: '🎃', label: 'Pumpkin garden' },
    { id: 'panic', icon: '⚡', label: 'Panic mode' },
    { id: 'personality', icon: '✨', label: 'Personality' },
    { id: 'shop', icon: '🛍️', label: 'Costume shop' },
    { id: 'achievements', icon: '🏆', label: 'Achievements' },
    { id: 'leaderboard', icon: '📜', label: 'Leaderboard' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  return (
    <div className="game-shell">
      <div className="sky-decor" aria-hidden="true">
        <span className="star star-one">✦</span><span className="star star-two">✧</span><span className="star star-three">✦</span>
        <span className="leaf leaf-one">🍂</span><span className="leaf leaf-two">🍁</span><span className="ghost-float">👻</span>
      </div>
      <header className="topbar">
        <button className="brand" onClick={() => { setPanicActive(false); setPage('home') }} aria-label="Pumpkin Panic home">
          <span className="brand-icon">🎃</span><span>PUMPKIN<span className="brand-light"> PANIC</span></span>
        </button>
        <div className="topbar-right">
          <span className="coin-pill">🪙 <b>{save.coins}</b></span>
          <IconButton label={save.sound ? 'Turn sound off' : 'Turn sound on'} onClick={toggleSound}>{save.sound ? '🔊' : '🔇'}</IconButton>
        </div>
      </header>

      <div className="app-layout">
        <nav className="sidebar" aria-label="Main navigation">
          <p className="nav-caption">YOUR PATCH</p>
          {navItems.map((item) => (
            <button key={item.id} className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); if (item.id !== 'panic') setPanicActive(false) }}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
              {item.id === 'panic' && <span className="nav-live" aria-hidden="true" />}
            </button>
          ))}
          <div className="sidebar-bottom">
            <div className="sidebar-pumpkin"><Pumpkin accessory={save.equipped} /><p>Your pumpkin pal</p><span>{save.pumpkinCount} collected</span></div>
            <p className="local-note">🌙 Your progress lives on this device.</p>
          </div>
        </nav>

        <main className="main-content">
          <div className="mobile-nav">
            <label htmlFor="page-select" className="sr-only">Choose a game section</label>
            <select id="page-select" value={page} onChange={(event) => { setPage(event.target.value); if (event.target.value !== 'panic') setPanicActive(false) }}>
              {navItems.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}
            </select>
          </div>
          {page === 'home' && <HomeScreen onPlay={() => setPage('garden')} onPanic={startPanic} onHow={() => setHelpOpen(true)} sound={save.sound} toggleSound={toggleSound} costume={save.equipped} />}
          {page === 'garden' && <GardenScreen save={save} onClick={clickGardenPumpkin} clicks={gardenClicks} onPanic={startPanic} />}
          {page === 'panic' && <PanicScreen active={panicActive} time={panicTime} score={panicScore} targets={targets} onStart={startPanic} onTarget={clickTarget} onGarden={() => setPage('garden')} />}
          {page === 'personality' && <PersonalityScreen personality={personality} onGenerate={() => setPersonality(makePersonality())} />}
          {page === 'shop' && <ShopScreen save={save} onAction={buyOrEquip} />}
          {page === 'achievements' && <AchievementsScreen save={save} />}
          {page === 'leaderboard' && <LeaderboardScreen entries={save.leaderboard} best={save.bestScore} />}
          {page === 'settings' && <SettingsScreen save={save} onSound={toggleSound} onReset={resetProgress} onHow={() => setHelpOpen(true)} />}
          <footer className="footer-note">Made with a little moonlight & a lot of pumpkin spice <span>✦</span></footer>
        </main>
      </div>
      {helpOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false) }}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button type="button" className="modal-close" onClick={() => setHelpOpen(false)} aria-label="Close how to play">×</button><p className="eyebrow">A FIELD GUIDE FOR PUMPKIN PAL</p><h2 id="help-title">How to play</h2><div className="help-steps"><p><span>01</span><b>Visit the garden</b><small>Tap pumpkins to collect them and earn coins. Bonus pumpkins sometimes give extra coins.</small></p><p><span>02</span><b>Try Panic Mode</b><small>Catch pumpkins before the 30-second timer ends. Ghosts are cute, but tapping one earns no points.</small></p><p><span>03</span><b>Dress up your pal</b><small>Spend coins in the costume shop, then celebrate your pumpkin-collecting achievements.</small></p><p><span>04</span><b>Your scores stay local</b><small>Coins, costumes, achievements, and your top 10 runs are saved in this browser only.</small></p></div><button className="button button-primary" onClick={() => setHelpOpen(false)}>Got it, let’s play!</button></section></div>}
      {notice && <div className="toast" role="status" aria-live="polite">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
    </div>
  )
}

function makePersonality() {
  return { name: NAMES[rand(NAMES.length)], trait: TRAITS[rand(TRAITS.length)], line: PERSONALITY_LINES[rand(PERSONALITY_LINES.length)] }
}

function makeTarget(id) {
  return { id: id ?? `${Date.now()}-${Math.random()}`, kind: Math.random() < 0.23 ? 'ghost' : 'pumpkin', x: 8 + rand(82), y: 12 + rand(72), rotation: -12 + rand(24) }
}

function makeTargets(count) {
  return Array.from({ length: count }, (_, index) => makeTarget(`target-${index}`))
}

function PageHeading({ eyebrow, title, description, icon }) {
  return <div className="page-heading"><div><p className="eyebrow">{icon} {eyebrow}</p><h1>{title}</h1><p className="heading-description">{description}</p></div></div>
}

function HomeScreen({ onPlay, onPanic, onHow, sound, toggleSound, costume }) {
  const [randomMessage] = useState(() => GARDEN_REACTIONS[rand(GARDEN_REACTIONS.length)])
  return (
    <section className="home-screen">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="sparkle">✦</span> WELCOME TO THE PATCH <span className="sparkle">✦</span></div>
        <h1>The Great<br /><span>Pumpkin</span> Panic!</h1>
        <p className="hero-tagline">A tiny bit spooky. A whole lot of <em>squash-buckling.</em></p>
        <div className="hero-actions"><button className="button button-primary button-large" onClick={onPlay}>Let’s play <span>→</span></button><button className="button button-quiet" onClick={onPanic}>⚡ 30-second panic</button></div>
        <button className="how-link" onClick={onHow}>How to play <span>↗</span></button>
      </div>
      <div className="hero-art" aria-label="A pumpkin waiting in a moonlit patch">
        <div className="moon" aria-hidden="true" />
        <span className="hero-star hero-star-a">✦</span><span className="hero-star hero-star-b">✧</span>
        <div className="hero-pumpkin"><Pumpkin accessory={costume} /></div>
        <span className="hero-ghost">👻</span><span className="hero-leaf hero-leaf-a">🍂</span><span className="hero-leaf hero-leaf-b">🍁</span>
        <div className="hero-ground" />
        <div className="speech-bubble"><span>“{randomMessage}”</span><b>— a random pumpkin</b></div>
      </div>
      <div className="home-bottom"><span>🌙 A cozy little offline game</span><span>Collect · Dress up · Get silly</span><button onClick={toggleSound}>{sound ? '🔊 Sound on' : '🔇 Sound off'}</button></div>
    </section>
  )
}

function GardenScreen({ save, onClick, clicks, onPanic }) {
  return (
    <section>
      <PageHeading eyebrow="YOUR COZY CORNER" title="Pumpkin garden" description="Give your pumpkin pals a gentle tap. They love attention (and coins)." icon="🌱" />
      <div className="stat-row">
        <div className="stat-card"><span className="stat-icon">🎃</span><span className="stat-label">PUMPKINS FOUND</span><b>{save.pumpkinCount}</b></div>
        <div className="stat-card"><span className="stat-icon">🪙</span><span className="stat-label">YOUR COINS</span><b>{save.coins}</b></div>
        <div className="stat-card"><span className="stat-icon">🏆</span><span className="stat-label">PANIC BEST</span><b>{save.bestScore}</b></div>
      </div>
      <div className="garden-panel">
        <div className="panel-top"><div><h2>Tap a pumpkin!</h2><p>Every tap earns a pumpkin and a coin. Keep an eye out for bonuses.</p></div><span className="patch-badge">✦ THE PATCH ✦</span></div>
        <div className={`garden-grid ${clicks ? 'has-clicked' : ''}`}>
          {['Mabel', 'Pickles', 'Gourdge', 'Pip', 'Nugget', 'Pumpkin'].map((name, index) => (
            <button type="button" className={`garden-pumpkin pumpkin-${index}`} key={name} onClick={onClick} aria-label={`Collect ${name} the pumpkin`}>
              <span className="pumpkin-glow" /><span className="garden-face" aria-hidden="true">{['🎃', '🎃', '🎃', '🎃', '🎃', '🎃'][index]}</span><span className="pumpkin-name">{name}</span><span className="tap-hint">tap me!</span>
            </button>
          ))}
          <span className="garden-deco garden-deco-a" aria-hidden="true">🍄</span><span className="garden-deco garden-deco-b" aria-hidden="true">✨</span><span className="garden-deco garden-deco-c" aria-hidden="true">🍂</span>
        </div>
      </div>
      <div className="garden-bottom"><p>✨ {clicks ? 'The patch is absolutely thriving.' : 'Your pumpkins are waiting to meet you.'}</p><button className="button button-secondary" onClick={onPanic}>Try 30-second panic <span>→</span></button></div>
    </section>
  )
}

function PanicScreen({ active, time, score, targets, onStart, onTarget, onGarden }) {
  return (
    <section>
      <PageHeading eyebrow="READY, SET, GOURD" title="30-second panic" description="Tap pumpkins for points. Ghosts are only here for the drama." icon="⚡" />
      <div className="panic-scorebar"><div><span>TIME LEFT</span><b className={time <= 10 && active ? 'urgent' : ''}>{String(time).padStart(2, '0')}<small>s</small></b></div><div className="panic-round"><span>YOUR SCORE</span><b>🎃 {score}</b></div><div className="panic-rules">🎃 +1 point &nbsp; 👻 no points</div></div>
      <div className={`panic-arena ${active ? 'is-live' : ''}`}>
        <div className="arena-stars" aria-hidden="true">✦ ✧ ✦ ✧</div>
        {!active ? (
          <div className="arena-start"><div className="arena-mascot">🎃</div><h2>{time === 0 ? 'That was a close squash!' : 'Ready for a little chaos?'}</h2><p>{time === 0 ? `You caught ${score} pumpkin${score === 1 ? '' : 's'}!` : 'You have 30 seconds. Catch every pumpkin you can!'}</p><button className="button button-primary" onClick={onStart}>{time === 0 ? 'Play again' : 'Start panic!'} <span>→</span></button></div>
        ) : (
          <>
            <div className="live-label"><span className="live-dot" /> THE PATCH IS ON THE MOVE</div>
            {targets.map((target) => <button key={target.id} className={`panic-target ${target.kind}`} style={{ left: `${target.x}%`, top: `${target.y}%`, '--tilt': `${target.rotation}deg` }} onClick={() => onTarget(target)} aria-label={target.kind === 'ghost' ? 'Ghost, avoid this!' : 'Catch this pumpkin for one point'}>{target.kind === 'ghost' ? '👻' : '🎃'}</button>)}
          </>
        )}
      </div>
      <div className="panic-footer"><span>🌙 Tip: the patch gets faster as your score grows!</span><button className="text-button" onClick={onGarden}>Back to the garden</button></div>
    </section>
  )
}

function PersonalityScreen({ personality, onGenerate }) {
  return (
    <section>
      <PageHeading eyebrow="MEET YOUR NEW FRIEND" title="Pumpkin personality" description="A very scientific personality test. Results may be a little seedy." icon="✨" />
      <div className="personality-card">
        <div className="personality-sparkle">✦ <span>✧</span> ✦</div><div className="personality-pumpkin"><Pumpkin /></div>
        <p className="eyebrow">PLEASE WELCOME</p><h2>{personality.name}</h2><div className="trait-pill">{personality.trait}</div>
        <p className="personality-line">“{personality.line}”</p>
        <button className="button button-primary" onClick={onGenerate}>Meet another pumpkin <span>↻</span></button>
      </div>
      <p className="offline-note">✨ All personalities are home-grown, randomly generated, and 100% offline.</p>
    </section>
  )
}

function ShopScreen({ save, onAction }) {
  return (
    <section>
      <PageHeading eyebrow="A LITTLE PATCH OF STYLE" title="Costume shop" description="Your pumpkin deserves to look delightfully ridiculous." icon="🛍️" />
      <div className="shop-preview"><div className="preview-pumpkin"><Pumpkin accessory={save.equipped} /></div><div><p className="eyebrow">CURRENT LOOK</p><h2>{COSTUMES.find((item) => item.id === save.equipped)?.name ?? 'Classic pumpkin'}</h2><p>Looking absolutely gourd-geous.</p></div><span className="coin-pill">🪙 <b>{save.coins}</b></span></div>
      <div className="costume-grid">{COSTUMES.map((item) => {
        const owned = save.ownedCostumes.includes(item.id)
        const equipped = save.equipped === item.id
        return <article className={`costume-card ${item.color}`} key={item.id}><div className="costume-icon">{item.icon}</div><h3>{item.name}</h3><p>{owned ? equipped ? 'On your pumpkin now' : 'Ready for a night out' : 'A very fine choice'}</p><button className={`button ${equipped ? 'button-equipped' : owned ? 'button-secondary' : 'button-outline'}`} onClick={() => onAction(item)} disabled={equipped}>{equipped ? '✓ Equipped' : owned ? 'Equip this' : <>🪙 {item.price} <span>· Buy</span></>}</button></article>
      })}</div>
    </section>
  )
}

function AchievementsScreen({ save }) {
  return (
    <section>
      <PageHeading eyebrow="TINY TROPHIES, BIG FEELINGS" title="Achievements" description="Every pumpkin you collect brings you closer to patch legend status." icon="🏆" />
      <div className="achievement-summary"><span>🎃</span><div><b>{save.unlocked.length} of {ACHIEVEMENTS.length} achievements</b><p>{save.pumpkinCount} total pumpkins collected</p></div><div className="progress-track"><span style={{ width: `${(save.unlocked.length / ACHIEVEMENTS.length) * 100}%` }} /></div></div>
      <div className="achievement-list">{ACHIEVEMENTS.map((item) => {
        const unlocked = save.unlocked.includes(item.id)
        const progress = Math.min(save.pumpkinCount, item.count)
        return <article className={`achievement-card ${unlocked ? 'unlocked' : ''}`} key={item.id}><span className="achievement-icon">{unlocked ? item.icon : '🔒'}</span><div className="achievement-copy"><h2>{item.title}</h2><p>{item.description}</p><div className="mini-progress"><span style={{ width: `${(progress / item.count) * 100}%` }} /></div><small>{unlocked ? 'Unlocked!' : `${progress} / ${item.count} pumpkins`}</small></div><span className="achievement-check">{unlocked ? '✓' : '·'}</span></article>
      })}</div>
    </section>
  )
}

function LeaderboardScreen({ entries, best }) {
  return (
    <section>
      <PageHeading eyebrow="A LOCAL LEGENDS LIST" title="Leaderboard" description="Your personal top runs, saved right here on this device. No internet, no competition with ghosts." icon="📜" />
      <div className="leaderboard-card"><div className="leaderboard-header"><div><p className="eyebrow">YOUR PERSONAL BEST</p><      strong>{best} <small>{best === 1 ? 'pumpkin' : 'pumpkins'}</small></strong></div><span className="leaderboard-trophy">🏆</span></div>
        {entries.length === 0 ? <div className="empty-state"><span>🌱</span><h2>No runs yet!</h2><p>Play Panic Mode and your best 10 runs will show up here.</p></div> :
          <ol className="score-list">{entries.map((entry, index) => <li key={`${entry.date}-${index}`}><span className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><span className="score-pumpkin">🎃</span><span className="score-name">{index === 0 ? 'Patch champion' : `Pumpkin run ${entries.length - index}`}</span><time dateTime={entry.date}>{formatDate(entry.date)}</time><b className="score-points">{entry.score} <small>{entry.score === 1 ? 'pt' : 'pts'}</small></b></li>)}</ol>}
        <p className="local-note leaderboard-note">🔒 This leaderboard is local to this browser. It is not global or online.</p>
      </div>
    </section>
  )
}

function SettingsScreen({ save, onSound, onReset, onHow }) {
  return (
    <section>
      <PageHeading eyebrow="MAKE YOURSELF AT HOME" title="Settings" description="A few little switches for your moonlit patch." icon="⚙️" />
      <div className="settings-card"><div className="setting-row"><div className="setting-icon">🔊</div><div className="setting-copy"><h2>Sound effects</h2><p>Little synthesized boops and pumpkin pops. No audio files needed.</p></div><button role="switch" aria-checked={save.sound} className={`toggle ${save.sound ? 'on' : ''}`} onClick={onSound}><span /></button></div>
        <div className="setting-row"><div className="setting-icon">🎮</div><div className="setting-copy"><h2>How to play</h2><p>Tap pumpkins in the garden. In Panic Mode, catch pumpkins and leave ghosts alone.</p></div><button className="button button-secondary" onClick={onHow}>Read how to play</button></div>
        <div className="setting-row danger-row"><div className="setting-icon">🧹</div><div className="setting-copy"><h2>Reset progress</h2><p>Clear your coins, costumes, achievements, and local high scores.</p></div><button className="button button-danger" onClick={onReset}>Reset everything</button></div>
      </div>
      <p className="settings-footnote">Progress is saved in this browser’s local storage. Clearing browser data will also clear your save.</p>
    </section>
  )
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default App
