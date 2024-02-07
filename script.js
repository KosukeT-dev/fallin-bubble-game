const { Bodies, Body, Composite, Engine, Events, Render, Runner, Sleeping } = Matter;

const WIDTH = 420; 
const HEIGHT = 700; 
const WALL_T = 10; 
const DEADLINE = 600; 
const FRICTION = 0.3; 
const MASS = 1; 
const MAX_LEVEL = 11;
const WALL_COLOR = "#ccc";
const BUBBLE_COLORS = {
  0: "#ff7f7f",
  1: "#ff7fbf",
  2: "#ff7fff",
  3: "#bf7fff",
  4: "#7f7fff",
  5: "#7fbfff",
  6: "#7fffff",
  7: "#7fffbf",
  8: "#7fff7f",
  9: "#bfff7f",
  10: "#ffff7f",
};

const OBJECT_CATEGORIES = {
  WALL: 0x0001,
  BUBBLE: 0x0002,
  BUBBLE_PENDING: 0x0004,
};

class BubbeGame {
  engine;
  render;
  runner;
  currentBubble = undefined;
  score;
  scoreChangeCallBack;
  gameover = false;
  defaultX = WIDTH / 2;
  message;
  timer;
  timeLimit = 60;

  constructor(container, message, scoreChangeCallBack) {
    this.message = message;
    this.scoreChangeCallBack = scoreChangeCallBack;
    this.engine = Engine.create({
      constraintIterations: 3
    });
    this.render = Render.create({
      element: container,
      engine: this.engine,
      options: {
        width: WIDTH,
        height: HEIGHT,
        wireframes: false,
      },
    });
    this.runner = Runner.create();
    Render.run(this.render);
    container.addEventListener("click", this.handleClick.bind(this));
    container.addEventListener("mousemove", this.handleMouseMove.bind(this));
    Events.on(this.engine, "collisionStart", this.handleCollision.bind(this));
    Events.on(this.engine, "afterUpdate", this.checkGameOver.bind(this));
  }

  init() {
    Composite.clear(this.engine.world);
    this.resetMessage();
    this.gameover = false;
    this.setScore(0);

    const ground = Bodies.rectangle(
      WIDTH / 2,
      HEIGHT - WALL_T / 2,
      WIDTH,
      WALL_T,
      {
        isStatic: true,
        label: "ground",
        render: {
          fillStyle: WALL_COLOR,
        },
      }
    );
    const leftWall = Bodies.rectangle(WALL_T / 2, HEIGHT / 2, WALL_T, HEIGHT, {
      isStatic: true,
      label: "leftWall",
      render: {
        fillStyle: WALL_COLOR,
      },
    });
    const rightWall = Bodies.rectangle(
      WIDTH - WALL_T / 2,
      HEIGHT / 2,
      WALL_T,
      HEIGHT,
      {
        isStatic: true,
        label: "rightWall",
        render: {
          fillStyle: WALL_COLOR,
        },
      }
    );

    Composite.add(this.engine.world, [ground, leftWall, rightWall]);
    Runner.run(this.runner, this.engine);

    this.gameStatus = "ready";
    this.showReadyMessage();
  }

  start(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.gameStatus === "ready") {
      this.gameStatus = "canput";
      this.createNewBubble();
      this.resetMessage();
      this.startTimer();
    }
  }

  startTimer() {
    let timeLeft = this.timeLimit;
    this.timer = setInterval(() => {
      timeLeft--;
      if (timeLeft >= 0) {
        this.updateTimer(timeLeft);
      } else {
        clearInterval(this.timer);
        this.timer = null;
        if (!this.gameover) {
          this.gameOver();
        }
      }
    }, 1000);
  }

  resetTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  gameOver() {
    this.gameover = true;
    Runner.stop(this.runner);
    this.resetTimer(); 
    this.showGameOverMessage();
  }

  createNewBubble() {
    if (this.gameover) {
      return;
    }
  
    const level = Math.floor(Math.random() * 5);
    const radius = level * 10 + 20;

    const currentBubble = Bodies.circle(this.defaultX, 30, radius, {
      isSleeping: true,
      label: "bubble_" + level,
      friction: FRICTION,
      mass: MASS,
      collisionFilter: {
        group: 0,
        category: OBJECT_CATEGORIES.BUBBLE_PENDING,
        mask: OBJECT_CATEGORIES.WALL | OBJECT_CATEGORIES.BUBBLE,
      },
      render: {
        fillStyle: BUBBLE_COLORS[level],
        lineWidth: 1,
      },
    });
    this.currentBubble = currentBubble;
    Composite.add(this.engine.world, [currentBubble]);
  }

  putCurrentBubble() {
    if (this.currentBubble) {
      Sleeping.set(this.currentBubble, false);
      this.currentBubble.collisionFilter.category = OBJECT_CATEGORIES.BUBBLE;
      this.currentBubble = undefined;
    }
  }

  checkGameOver() {
    const bubbles = Composite.allBodies(this.engine.world).filter((body) =>
      body.label.startsWith("bubble_")
    );
    for (const bubble of bubbles) {
      if (bubble.position.y < HEIGHT - DEADLINE && bubble.velocity.y < 0) {
        this.gameOver();
        break;
      }
    }
  }

  showReadyMessage() {
    const p = document.createElement("p");
    p.classList.add("mainText");
    p.textContent = "Fallin' Bubble Game";
    const p2 = document.createElement("p");
    p2.classList.add("subText");
    p2.textContent = "Make the bubble bigger within 60 seconds!";
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.classList.add("button");
    button.addEventListener("click", this.start.bind(this));
    button.innerText = "START!";
    this.message.appendChild(p);
    this.message.appendChild(p2);
    this.message.appendChild(button);
    this.message.style.display = "block";
  }

  showGameOverMessage() {
    if (this.message.children.length === 0) {
      const p = document.createElement("p");
      p.classList.add("mainText");
      p.textContent = "Game Over";
      const p2 = document.createElement("p");
      p2.classList.add("subText");
      p2.textContent = `Score: ${this.score}`;
      const button = document.createElement("button");
      button.setAttribute("type", "button");
      button.classList.add("button");
      button.addEventListener("click", this.init.bind(this));
      button.innerText = "Try again";
      this.message.appendChild(p);
      this.message.appendChild(p2);
      this.message.appendChild(button);
      this.message.style.display = "block";
    }
  }

  resetMessage() {
    this.message.replaceChildren();
    this.message.style.display = "none";
  }

  handleClick() {
    if (this.gameover) {
      return;
    }
    if (this.gameStatus === "canput") {
      this.putCurrentBubble();
      this.gameStatus = "interval";
      setTimeout(() => {
        this.createNewBubble();
        this.gameStatus = "canput";
      }, 500);
    }
  }

  handleCollision({ pairs }) {
    for (const pair of pairs) {
      const { bodyA, bodyB } = pair;
      if (
        !Composite.get(this.engine.world, bodyA.id, "body") ||
        !Composite.get(this.engine.world, bodyB.id, "body")
      ) {
        continue;
      }
      if (bodyA.label === bodyB.label && bodyA.label.startsWith("bubble_")) {
        const currentBubbleLevel = Number(bodyA.label.substring(7));
        this.setScore(this.score + 2 ** currentBubbleLevel);
        if (currentBubbleLevel === 11) {
          Composite.remove(this.engine.world, [bodyA, bodyB]);
          continue;
        }
        const newLevel = currentBubbleLevel + 1;
        const newX = (bodyA.position.x + bodyB.position.x) / 2;
        const newY = (bodyA.position.y + bodyB.position.y) / 2;
        const newRadius = newLevel * 10 + 20;
        const newBubble = Bodies.circle(newX, newY, newRadius, {
          label: "bubble_" + newLevel,
          friction: FRICTION,
          mass: MASS,
          collisionFilter: {
            group: 0,
            category: OBJECT_CATEGORIES.BUBBLE,
            mask: OBJECT_CATEGORIES.WALL | OBJECT_CATEGORIES.BUBBLE,
          },
          render: {
            fillStyle: BUBBLE_COLORS[newLevel],
            lineWidth: 1,
          },
        });
        Composite.remove(this.engine.world, [bodyA, bodyB]);
        Composite.add(this.engine.world, [newBubble]);
      }
    }
  }

  handleMouseMove(e) {
    if (this.gameStatus !== "canput" || !this.currentBubble) {
      return;
    }
    const { offsetX } = e;
    const currentBubbleRadius =
      Number(this.currentBubble.label.substring(7)) * 10 + 20;
    const newX = Math.max(
      Math.min(offsetX, WIDTH - 10 - currentBubbleRadius),
      10 + currentBubbleRadius
    );
    Body.setPosition(this.currentBubble, {
      x: newX,
      y: this.currentBubble.position.y,
    });
    this.defaultX = newX;
  }

  updateTimer(timeLeft) {
    const timerElement = document.querySelector('.timer');
    if (timerElement) {
      timerElement.textContent = `Time Left: ${timeLeft} seconds`;
    }
  }

  setScore(score) {
    this.score = score;
    if (this.scoreChangeCallBack) {
      this.scoreChangeCallBack(score);
    }
  }
}

window.onload = () => {
  const container = document.querySelector(".container");
  const message = document.querySelector(".message");
  const onChangeScore = (val) => {
    const score = document.querySelector(".score");
    score.replaceChildren(`Score: ${val}`);
  };
  const game = new BubbeGame(container, message, onChangeScore);
  game.init();
};
