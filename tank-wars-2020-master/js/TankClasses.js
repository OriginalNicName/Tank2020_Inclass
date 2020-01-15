class BaseTank {
  scene;
  shadow;
  hull;
  turret;
  damageCount;
  damageMax;
  bullets;
  constructor(scene, x, y, texture, frame) {
    this.scene = scene;
    // assemble  shadow, hull and turret of tank
    this.shadow = scene.physics.add.sprite(x, y, texture, 'shadow');
    this.shadow.setDepth(1);
    this.hull = scene.physics.add.sprite(x, y, texture, frame);
    //  TODO check body size
    this.hull.body.collideWorldBounds = true;
    this.hull.body.bounce.setTo(1, 1);
    this.hull.setDepth(2);
    this.turret = scene.physics.add.sprite(x, y, texture, 'turret');
    // leave depth 3 for projectile
    this.turret.setDepth(4);
    // set damageCount and damageMax
    this.damageCount = 0;
    this.damageMax = 2;
  }
  update() {
    // make shadow and turret position match hull position
    this.shadow.x = this.turret.x = this.hull.x;
    this.shadow.y = this.turret.y = this.hull.y;
    // make shadow rotation match hull rotation
    this.shadow.rotation = this.hull.rotation;
  }
  damage() {
    // overridden in child 
    console.log('it hurts!');
  }
  setBullets(bullets) {
    // assign bullets physics group
    this.bullets = bullets;
  }
  burn() {
    // remove turret
    this.turret.setVisible(false);
    // set speed to zero
    this.hull.setVelocity(0);
    // make immovable
    this.hull.body.immovable = true;
  }
  isDestroyed() {
    // check whether damagecount equals or exceeds damagemax
    if (this.damageCount >= this.damageMax) {
      return true
    }
  }
  enableCollision(destructLayer) {
    // set collision with destructable layer
    this.scene.physics.add.collider(this.hull, destructLayer);
  }
}
class EnemyTank extends BaseTank {
  player;
  nextShot;
  constructor(scene, x, y, texture, frame, player) {
    super(scene, x, y, texture, frame);
    this.player = player;
    // set tanke to random angle
    this.hull.angle = Phaser.Math.RND.angle();
    // set velocity from rotation
    this.scene.physics.velocityFromRotation(this.hull.rotation, 100, this.hull.body.velocity);
    // initialise next shot time
    this.nextShot = 0;
  }
  update(time, delta) {
    super.update();
    this.turret.rotation = Phaser.Math.Angle.Between(this.hull.x, this.hull.y, this.player.hull.x, this.player.hull.y);
    this.shadow.rotation = this.hull.rotation = Math.atan2(this.hull.body.velocity.y, this.hull.body.velocity.x);
    // rotate turret towards player
    // match shadow and hull rotation to xy velocities
    // if undamaged and distance to player permits, check whether next shot time valid
    if (this.damageCount <= this.damageMax - 2 &&
      Phaser.Math.Distance.Between(this.hull.x, this.hull.y, this.player.hull.x, this.player.hull.y) < 300
    ) {
      if (this.nextShot > time) {
        return
      }
      this.nextShot = time + 2000;
      let bullet = this.bullets.get(this.turret.x, this.turret.y);
      if (bullet) {
        this.scene.fireBullet(bullet, this.turret.rotation, this.player);
      }
    }
    // if above all true, reset next shot time, get reference to available bullet
    // call scene fireBullet
  }
  damage() {
    // increment damageCount
    this.damageCount++;
    // if count greater than max
    if (this.isDestroyed()) {
      this.turret.destroy();
      this.hull.destroy();
    } else if (this.damageCount == this.damageMax - 1) {
      this.burn();
    }
    // destroy turret and hull
    // else disable and burn tank
  }
}
class PlayerTank extends BaseTank {
  currentSpeed;
  keys;
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
    // set current speed
    this.currentSpeed = 0;
    // set up key listeners
    this.keys = scene.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });
    // set damage max
    this.damageMax = 10;
  }
  update() {
    super.update();
    // modify speed based on keys
    if (this.keys.w.isDown) {
      if (this.currentSpeed < 100) {
        this.currentSpeed += 10;
      }
    } else if (this.keys.s.isDown) {
      if (this.currentSpeed > -100) {
        this.currentSpeed -= 10;
      }
    } else {
      this.currentSpeed *= 0.9;
    }
    // modify angle based on keys
    if (this.keys.a.isDown) {
      if (this.currentSpeed > 0) {
        this.hull.angle--;
      } else {
        this.hull.angle++;
      }
    } else if (this.keys.d.isDown) {
      if (this.currentSpeed > 0) {
        this.hull.angle++;
      } else {
        this.hull.angle--;
      }
    }
    // modify velocity from rotation
    this.scene.physics.velocityFromRotation(this.hull.rotation, this.currentSpeed, this.hull.body.velocity);
    // get ref to mouse location
    let worldPoint = this.scene.input.activePointer.positionToCamera(this.scene.cameras.main);
    // make turret point towards mouse
    this.turret.rotation = Phaser.Math.Angle.Between(this.turret.x, this.turret.y, worldPoint.x, worldPoint.y);
  }
  damage() {
    // shake camera
    this.scene.cameras.main.shake(200, 0.005);
    // increment damage count
    this.damageCount++;
    // if damage count equal or greater to max, burn
    if (this.isDestroyed()) {
      this.burn();
    }
  }
}