let engine;
let tablePic;
let ballPics = {};
let pixFont;
let mainBall;
let allBalls = [];
let dragPt;
const ballSize = 12;
const mainStartX = 700;
const pocketRatio = 3.5;
const rim = 40;
let phoneNum = "";
const maxDigits = 10;
let phoneBox = {
  x: 100,
  y: 520,
  w: 720,
  h: 60
};
let timer = 40;
let lastTick = 0;
let timerOn = true;
let showInstructions = true;
let showCompletionPopup = false;
class Wall {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    let cx = x + w / 2;
    let cy = y + h / 2;
    this.body = Matter.Bodies.rectangle(cx, cy, w, h, {
      isStatic: true,
    });
    Matter.World.add(engine.world, this.body);
  }
}
const table = {
  left: 110 - rim,
  top: 83 - rim,
  right: 818,
  bottom: 414,
  boundaries: [],
  pockets: [],
  w: function () {
    return this.right - this.left;
  },
  h: function () {
    return this.bottom - this.top;
  },
  centerY: function () {
    return this.top + this.h() / 2;
  },
  initBoundaries: function () {
    this.boundaries = [
      new Wall(this.left, this.top, this.w(), rim),
      new Wall(this.left, this.bottom, this.w(), rim),
      new Wall(this.left, this.top, rim, this.h()),
      new Wall(this.right, this.top, rim, this.h() + rim),
    ];
  },
  initPockets: function () {
    this.pockets = [
      createVector(100, 76),
      createVector(457, 66),
      createVector(826, 74),
      createVector(100, 420),
      createVector(463, 430),
      createVector(828, 420),
    ];
  },
  checkPockets: function () {
    for (let i = allBalls.length - 1; i >= 0; i--) {
      let ball = allBalls[i];
      for (let pocket of table.pockets) {
        let d = dist(ball.body.position.x, ball.body.position.y, pocket.x, pocket.y);
        if (d < ballSize * pocketRatio) {
          if (ball.name === "cue") {
            transformCue();
          } else {
            let ballNum = ball.name.replace("ball", "");
            addToPhoneNumber(ballNum);
            let randPos = getRandomTablePosition();
            ball.setPosition(randPos.x, randPos.y);
            ball.setVelocity(0, 0);
            ball.startRespawnAnimation();
          }
          break;
        }
      }
    }
  },
};

function preload() {
  /* This loads all the images and fonts before the game starts. */
  tablePic = loadImage("images/table.png");
  ballPics.cue = loadImage("images/cue.png");
  for (let i = 0; i <= 9; i++) {
    ballPics[`ball${i}`] = loadImage(`images/${i}.png`);
  }
  pixFont = loadFont("assets/PressStart.ttf");
}

class Ball {
  constructor(x, y, name) {
    this.name = name;
    this.body = Matter.Bodies.circle(x, y, ballSize, {
      restitution: 0.9,
      friction: 0.005,
      density: 0.01,
    });
    Matter.World.add(engine.world, this.body);
    this.rotationAxis = createVector(0, 0, 1);
    this.rotationAngle = 0;
    this.scale = 1.0;
    this.isAnimating = false;
    this.animationTimer = 0;
    this.animationDuration = 60;
  }
  x() {
    return this.body.position.x;
  }
  y() {
    return this.body.position.y;
  }
  setPosition(x, y) {
    Matter.Body.setPosition(this.body, { x, y });
  }
  setVelocity(x, y) {
    Matter.Body.setVelocity(this.body, { x, y });
  }
  velocity() {
    return new p5.Vector(this.body.velocity.x, this.body.velocity.y);
  }
  startRespawnAnimation() {
    this.isAnimating = true;
    this.animationTimer = 0;
    this.scale = 0.1;
  }
  updateAnimation() {
    if (this.isAnimating) {
      this.animationTimer++;
      let progress = this.animationTimer / this.animationDuration;
      this.scale = 0.1 + (0.9 * (1 - pow(1 - progress, 3)));
      if (this.animationTimer >= this.animationDuration) {
        this.isAnimating = false;
        this.scale = 1.0;
      }
    }
  }
  display() {
    this.updateAnimation();
    push();
    translate(this.x(), this.y());
    scale(this.scale);
    noStroke();
    if (this.velocity().mag() > 0.1) {
      this.rotationAxis = this.velocity().copy().rotate(HALF_PI);
      this.rotationAngle += this.velocity().mag() / (PI * ballSize);
    }
    rotate(this.rotationAngle, this.rotationAxis);
    let ballTexture = ballPics[this.name];
    if (ballTexture) {
      texture(ballTexture);
    } else {
      fill(255, 0, 0);
    }
    sphere(ballSize);
    pop();
  }
}

function rackBalls() {
  /* This puts all the balls in a triangle at the start. */
  mainBall = new Ball(mainStartX, table.centerY(), "cue");
  allBalls.push(mainBall);
  const rackNums = [9, 7, 8, 1, 6, 3, 2, 4, 5, 0];
  const footX = 290;
  const gap = 2 * ballSize + 3;
  const xGap = sqrt(3) * ballSize;
  let i = 0;
  let rowNum = 1;
  for (let row = 0; i < rackNums.length; row++) {
    for (let col = 0; col < rowNum && i < rackNums.length; col++) {
      let id = rackNums[i];
      let xPos = footX - row * xGap;
      let yPos = table.centerY() - (rowNum - 1) * ballSize + col * gap;
      allBalls.push(new Ball(xPos, yPos, `ball${id}`));
      i++;
    }
    rowNum++;
  }
}

function keyPressed() {
  /* Handles when you press keys. Space or Enter starts the game, C clears your phone number. */
  if (key === "c" || key === "C") clearPhoneNumber();
  if (key === " " || key === "Enter") {
    if (showInstructions) {
      showInstructions = false;
    } else if (showCompletionPopup) {
      showCompletionPopup = false;
      clearPhoneNumber();
    }
  }
}

function mousePressed() {
  /* When you click, this checks if you want to start, reset, or drag the cue ball. */
  if (showInstructions) {
    showInstructions = false;
    return;
  }
  if (showCompletionPopup) {
    showCompletionPopup = false;
    clearPhoneNumber();
    return;
  }
  if (!mainBall) return;
  let distance = dist(mouseX, mouseY, mainBall.body.position.x, mainBall.body.position.y);
  if (distance <= ballSize * 2) {
    dragPt = createVector(mouseX, mouseY);
  }
}
function mouseReleased() {
  /* When you let go of the mouse, this shoots the cue ball if you were dragging it. */
  if (!dragPt || !mainBall) return;
  let force = p5.Vector.sub(dragPt, createVector(mouseX, mouseY));
  force.mult(0.1);
  Matter.Body.setVelocity(mainBall.body, force);
  dragPt = null;
}

function drawCueLine() {
  /* Draws a line from the cue ball to your mouse so you know where you're aiming. */
  if (!mainBall) return;
  stroke("cyan");
  strokeWeight(4);
  line(mainBall.body.position.x, mainBall.body.position.y, mouseX, mouseY);
  noStroke(0);
}

function resetCueBall() {
  /* Puts the cue ball back in its starting spot. */
  mainBall.setPosition(mainStartX, table.centerY());
  mainBall.setVelocity(0, 0);
}

function transformCue() {
  /* The cue ball turns into a random number ball. */
  let randomNumber = Math.floor(Math.random() * 10);
  mainBall.name = `ball${randomNumber}`;
  mainBall.setPosition(mainStartX, table.centerY());
  mainBall.setVelocity(0, 0);
  mainBall.startRespawnAnimation();
}

function getRandomTablePosition() {
  /* Gives you a random spot on the table for respawning balls. */
  let margin = ballSize * 2;
  let x = random(table.left + rim + margin, table.right - margin);
  let y = random(table.top + rim + margin, table.bottom - margin);
  return { x, y };
}

function addToPhoneNumber(digit) {
  /* Adds a digit to your phone number when you sink a ball. */
  if (phoneNum.length < maxDigits) {
    phoneNum += digit;
    if (phoneNum.length === maxDigits) {
      timerOn = false;
      showCompletionPopup = true;
    }
  }
}

function clearPhoneNumber() {
  /* Clears your phone number so you can start over. */
  phoneNum = "";
  resetTimer();
}

function resetTimer() {
  /* Resets the timer back to 40 seconds. */
  timer = 40;
  lastTick = millis();
  timerOn = true;
}

function updateTimer() {
  /* Counts down the timer every second. If you run out, your number gets cleared. */
  if (timerOn && phoneNum.length < maxDigits) {
    let currentTime = millis();
    if (currentTime - lastTick >= 1000) {
      timer--;
      lastTick = currentTime;
      if (timer <= 0) {
        phoneNum = "";
        resetTimer();
      }
    }
  }
}

function formatPhoneNumber(number) {
  /* Makes your phone number look like a real phone number. (123) 456-7890 */
  if (number.length === 0) return "";
  if (number.length <= 3) return `(${number}`;
  if (number.length <= 6) return `(${number.slice(0, 3)}) ${number.slice(3)}`;
  return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
}

function drawPhoneNumberDisplay() {
  /* Draws the box that shows your phone number and how many digits you have. */
  push();
  fill(50, 50, 50, 200);
  stroke(255);
  strokeWeight(3);
  rect(phoneBox.x, phoneBox.y, phoneBox.w, phoneBox.h);
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  textFont(pixFont);
  let showText = formatPhoneNumber(phoneNum);
  if (showText === "") {
    fill(150);
    showText = "Sink balls to enter phone number...";
    textSize(18);
  }
  text(showText, phoneBox.x + phoneBox.w/2, phoneBox.y + phoneBox.h/2);
  fill(200);
  textSize(12);
  textAlign(RIGHT, BOTTOM);
  text(`${phoneNum.length}/${maxDigits}`, phoneBox.x + phoneBox.w - 10, phoneBox.y + phoneBox.h - 5);
  pop();
}

function drawTimer() {
  /* Draws the timer box and the countdown bar. It gets red when you're almost out of time */
  if (!timerOn || phoneNum.length === maxDigits) return;
  push();
  let timerX = 20;
  let timerY = 20;
  let timerW = 200;
  let timerH = 80;
  let bgColor;
  if (timer > 30) {
    bgColor = color(0, 100, 0, 180);
  } else if (timer > 10) {
    bgColor = color(200, 200, 0, 180);
  } else {
    bgColor = color(200, 0, 0, 180);
  }
  fill(bgColor);
  stroke(255);
  strokeWeight(2);
  rect(timerX, timerY, timerW, timerH);
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  textFont(pixFont);
  text("TIME LEFT", timerX + timerW/2, timerY + 20);
  textSize(32);
  if (timer <= 10) {
    if (frameCount % 20 < 10) {
      fill(255, 100, 100);
    } else {
      fill(255, 0, 0);
    }
  } else {
    fill(255);
  }
  text(timer, timerX + timerW/2, timerY + 50);
  let barX = timerX + 10;
  let barY = timerY + timerH - 15;
  let barW = timerW - 20;
  let barH = 8;
  fill(50);
  noStroke();
  rect(barX, barY, barW, barH);
  let prog = timer / 40;
  let fillBar = barW * prog;
  if (prog > 0.5) {
    fill(0, 255, 0);
  } else if (prog > 0.16) {
    fill(255, 255, 0);
  } else {
    fill(255, 0, 0);
  }
  rect(barX, barY, fillBar, barH);
  pop();
}

function drawInstructions() {
  /* Shows the instructions screen at the start. Tells you how to play and what the controls are. */
  if (!showInstructions) return;
  
  push();
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  
  let boxW = 600;
  let boxH = 400;
  let boxX = (width - boxW) / 2;
  let boxY = (height - boxH) / 2;
  
  fill(20, 30, 50);
  stroke(0, 255, 136);
  strokeWeight(4);
  rect(boxX, boxY, boxW, boxH);
  
  fill(0, 255, 136);
  textAlign(CENTER, CENTER);
  textFont(pixFont);
  textSize(32);
  text("PhonyPool", boxX + boxW/2, boxY + 60);
  
  fill(255, 170, 0);
  textSize(14);
  text("Worst UI Challenge", boxX + boxW/2, boxY + 90);
  
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  let instrX = boxX + 40;
  let instrY = boxY + 130;
  let lineHeight = 25;
  let maxWidth = boxW - 80;
  
  text("HOW TO PLAY:", instrX, instrY);
  instrY += lineHeight * 1.5;
  
  textSize(12);
  
  let instructions = [
    "• Drag and shoot the white cue ball",
    "• Sink numbered balls (0-9) to enter",
    "  phone digits",
    "• Enter all 10 digits before time runs out!",
    "• If white ball goes in, it becomes a",
    "  random number",
    "• Press 'C' to clear phone number"
  ];
  
  for (let instruction of instructions) {
    text(instruction, instrX, instrY);
    instrY += lineHeight;
  }
  
  fill(0, 255, 136);
  textAlign(CENTER, CENTER);
  textSize(14);
  text("Click anywhere or press SPACE to start", boxX + boxW/2, boxY + boxH - 30);
  
  pop();
}

function drawCompletionPopup() {
  /* Shows the popup when you finish entering a phone number. It calls you a liar lol. */
  if (!showCompletionPopup) return;
  
  push();
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  
  let boxW = 500;
  let boxH = 300;
  let boxX = (width - boxW) / 2;
  let boxY = (height - boxH) / 2;
  
  fill(50, 20, 20);
  stroke(255, 50, 50);
  strokeWeight(4);
  rect(boxX, boxY, boxW, boxH);
  
  fill(255, 100, 100);
  textAlign(CENTER, CENTER);
  textFont(pixFont);
  textSize(28);
  text("LIAR!", boxX + boxW/2, boxY + 80);
  
  fill(255, 200, 200);
  textSize(16);
  text("You didn't enter your", boxX + boxW/2, boxY + 130);
  text("ACTUAL phone number!", boxX + boxW/2, boxY + 155);
  
  fill(255);
  textSize(12);
  text("Nobody ever does...", boxX + boxW/2, boxY + 190);
  
  fill(255, 100, 100);
  textSize(14);
  text("Click anywhere or press SPACE", boxX + boxW/2, boxY + boxH - 45);
  text("to try again", boxX + boxW/2, boxY + boxH - 25);
  
  pop();
}

function setup() {
  /* This sets up the game, makes the canvas, and puts all the balls and stuff in the right place. */
  let canvas = createCanvas(920, 600, WEBGL);
  canvas.parent('game-area');
  engine = Matter.Engine.create();
  engine.world.gravity.y = 0;
  table.initBoundaries();
  table.initPockets();
  rackBalls();
  imageMode(CENTER);
  Matter.Runner.run(engine);
  lastTick = millis();
}

function draw() {
  /* This is the main game loop. It draws everything and updates the game every frame. */
  background(220);
  translate(-width / 2, -height / 2);
  updateTimer();
  image(tablePic, 460, 300, 920, 600);
  
  if (!showInstructions && !showCompletionPopup) {
    allBalls.forEach((ball) => {
      ball.display();
    });
    table.checkPockets();
    if (dragPt) {
      drawCueLine();
    }
  }
  
  drawPhoneNumberDisplay();
  drawTimer();
  drawInstructions();
  drawCompletionPopup();
}
