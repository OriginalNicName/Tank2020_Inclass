class TankScene extends Phaser.Scene {
    map;
    destructLayer;
    player;
    enemyTanks = [];
    bullets;
    enemyBullets;
    explosions;
    score;
    constructor(){
        super("GameScene");
    }
    
    preload() {
        // load tank atlas 
        this.load.atlas('tank', 'assets/tanks/tanks.png', 'assets/tanks/tanks.json');
        this.load.atlas('enemy', 'assets/tanks/enemy-tanks.png', 'assets/tanks/tanks.json');
        this.load.atlas('boss', 'assets/tanks/enemy-boss.png', 'assets/tanks/tanks.json');
        // load bullet image
        this.load.image('bullet', 'assets/tanks/bullet.png');
        // load explosion spritesheet
        this.load.spritesheet('kaboom', 'assets/tanks/explosion.png', {
            frameWidth: 64,
            frameHeight: 64
        })
        // load tileset
        this.load.image('tileset', 'assets/tanks/landscape-tileset.png');
        this.load.image('tileset2', 'assets/tanks/landscape2-tileset.png');
        // load tilemap data
        this.load.tilemapTiledJSON('tilemap', 'assets/tanks/level1.json');

        //load in HP Bars
        this.load.image('outline-big', 'assets/ui/hp-bar-big.png');
        this.load.image('outline-small', 'assets/ui/hp-bar-small.png');
        this.load.image('bar-big', 'assets/ui/hp-bar2-big.png');
        this.load.image('bar-small', 'assets/ui/hp-bar2-small.png');

    }
    create() {
        this.score = 0;
        // load in the tilemap
        this.map = this.make.tilemap({
            key: 'tilemap'
        });
        // add tileset image to map
        let landscape = this.map.addTilesetImage('landscape-tileset', 'tileset');
        let landscape2 = this.map.addTilesetImage('landscape2-tileset', 'tileset2');
        // create static ground layer 
        this.map.createStaticLayer('ground', [landscape, landscape2]);
        // create dynamic destructable layer
        this.destructLayer = this.map.createDynamicLayer('destructable', landscape, 0, 0);
        // set collision by property for destructable layer
        this.destructLayer.setCollisionByProperty({
            collides: true
        });
        // set camera to map bounds
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        // set physics to map bounds
        // create enemy bullets physics group
        this.enemyBullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 5
        })
        // create player bullets physics group
        this.bullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 2
        })
        // get reference to object layer in tilemap data
        let objectLayer = this.map.getObjectLayer("objects");
        let enemyObjects = [];
        // create temporary array for enemy spawn points
        // retrieve custom properties for objects
        objectLayer.objects.forEach(function (object) {
            object = Utils.RetrieveCustomProperties(object);
            //test for object types
            if (object.type === "playerSpawn") {
                this.createPlayer(object);
            } else if (object.type === "enemySpawn") {
                enemyObjects.push(object);
            } else if (object.type === "bossSpawn") {
                enemyObjects.push(object);
            }
        }, this)
        for (let i = 0; i < enemyObjects.length; i++) {
            this.createEnemy(enemyObjects[i]);
        }
        // create explosion animation
        this.anims.create({
            key: 'explode',
            frames: this.anims.generateFrameNumbers('kaboom', {
                start: 0,
                end: 23,
                first: 23
            }),
            frameRate: 24

        })
        // create explosions physics group
        this.explosions = this.physics.add.group(
            {
                defaultKey: 'kaboom',
                maxSize: this.enemyTanks.length + 1
            })
        // listen to pointer down to trigger player shoot
        this.input.on('pointerdown', this.tryShoot, this);
        // camera follow player
        this.cameras.main.startFollow(this.player.hull, true, 0.5, 0.5);
        // listen for worldbounds event, dispose of bullets that reach world bounds
        this.physics.world.on('worldbounds', function (body) {
            this.disposeOfBullet(body.gameObject)
        }, this);

        this.uiScene = this.scene.get("UIScene");
        this.scene.launch(this.uiScene);
        this.uiScene.createUIElements(this);
    }
    update(time, delta) {
        // update player
        this.player.update();
        // update enemies
        for (let i = 0; i < this.enemyTanks.length; i++) {
            this.enemyTanks[i].update(time, delta)
        }
    }
    createPlayer(object) {
        this.player = new PlayerTank(this, object.x, object.y, 'tank', 'tank1');
        // enable player collision with destructable layer
        this.player.enableCollision(this.destructLayer);
    }
    createEnemy(object) {
        // object has x and y props
        let enemyTank
        if (object.type == "enemySpawn") {
            enemyTank = new EnemyTank(this, object.x, object.y, 'enemy', 'tank1', this.player);
        } else {
            enemyTank = new BossTank(this, object.x, object.y, 'boss', 'tank1', this.player);
        }
        enemyTank.initmvt()
        // create temp ref for enemy tank
        // create enemy tank 
        // enable enemy collision with destructable layer
        enemyTank.enableCollision(this.destructLayer);
        // set enemy bullets
        enemyTank.setBullets(this.enemyBullets);
        // add latest enemy tank to enemy tanks array
        this.enemyTanks.push(enemyTank);
        // add collider between latest enemy and player
        this.physics.add.collider(enemyTank.hull, this.player.hull);
        // add collider between latest enemy and all other enemies
        if (this.enemyTanks.length > 1) {
            for (let i = 0; i < this.enemyTanks.length - 1; i++) {
                this.physics.add.collider(enemyTank.hull, this.enemyTanks[i].hull);
            }
        }
    }
    tryShoot(pointer) {
        // check whether a bullet is available from group
        let bullet = this.bullets.get(this.player.turret.x, this.player.turret.y);
        // if so, place on player and call fireBullet
        if (bullet) {
            this.fireBullet(bullet, this.player.turret.rotation, this.enemyTanks);
        }
    }
    fireBullet(bullet, rotation, target) {
        // fyi bullet is a Sprite
        // set z index of bullet to appear above tank hull but below turret
        bullet.setDepth(3);
        // set bullet collision with world bounds
        bullet.body.collideWorldBounds = true;
        // activate onworldbounds event for bullet 
        bullet.body.onWorldBounds = true;
        // enable bullet: activate physics, make visible
        bullet.enableBody(false, bullet.x, bullet.y, true, true);
        // set bullet rotation
        bullet.rotation = rotation;
        // set velocity from rotation
        this.physics.velocityFromRotation(bullet.rotation, 500, bullet.body.velocity);
        // add collider between bullet and destructable layer
        this.physics.add.collider(bullet, this.destructLayer, this.damageWall, null, this);
        // if target is player, check for overlap with player
        if (target === this.player) {
            this.physics.add.overlap(this.player.hull, bullet, this.bulletHitPlayer, null, this);
        } else {
            // else check for overlap with all enemy tanks
            for (let i = 0; i < this.enemyTanks.length; i++) {
                this.physics.add.overlap(this.enemyTanks[i].hull, bullet, this.bulletHitEnemy, null, this);
            }
        }

    }
    bulletHitPlayer(hull, bullet) {
        // call disposeOfBullet
        this.disposeOfBullet(bullet);
        // damage player
        this.player.damage();
        // if player destroyed, end game, play explosion animation
        if (this.player.isDestroyed()) {
            this.input.enabled = false;
            this.enemyTanks = [];
            this.physics.pause();
            let explosion = this.explosions.get(hull.x, hull.y);
            if (explosion) {
                this.activateExplosion(explosion);
                explosion.play('explode');
            }
        }
    }
    disposeOfBullet(bullet) {
        // remove bullet from physics system, make invisible
        bullet.disableBody(true, true);
    }
    bulletHitEnemy(hull, bullet) {
        this.score++;
        this.uiScene.updateScoreText(this.score);
        // call disposeOfBullet
        this.disposeOfBullet(bullet);
        // loop though enemy tanks array and find enemy tank that has been hit
        let enemy, index;
        for (let i = 0; i < this.enemyTanks.length; i++) {
            enemy = this.enemyTanks[i];
            if (enemy.hull === hull) {
                index = i;
                break;
            }
        }
        // damage enemy
        enemy.damage();
        if (enemy.isDestroyed()) {
            this.enemyTanks.splice(index, 1);
        }
        // place explosion
        let explosion = this.explosions.get(hull.x, hull.y);
        // call activateExplosion
        if (explosion) {
            // play explosion animation
            this.activateExplosion(explosion);
            explosion.on('animationcomplete', this.animComplete, this);
            explosion.play('explode');
        }
        // if enemy is destroyed, remove from enemy tanks array
    }
    damageWall(bullet, tile) {
        // call disposeOfBullet
        this.disposeOfBullet(bullet);
        // retrieve tileset firstgid (used as an offset)
        let firstGID = this.destructLayer.tileset[0].firstgid;
        // retrieve custom props for next tile in set (this is the tile id in Tiled)
        let nextTileID = tile.index + 1 - firstGID;
        // set new tile using Phaser version of tile id
        let tileProps = this.destructLayer.tileset[0].tileProperties[nextTileID];
        let newTile = this.destructLayer.putTileAt(nextTileID + firstGID, tile.x, tile.y);
        // tile may not have custom props, so check these exist, if so set collision
        if (tileProps) {
            if (tileProps.collides) {
                newTile.setCollision(true);
            }
        }
    }
    animComplete(animation, frame, gameObject) {
        // disable and return the explosion sprite to the explosions pool
        gameObject.disableBody(true, true);
    }
    activateExplosion(explosion) {
        // set z index of explosion above everything else
        explosion.setDepth(5);
        // activate explosion
        explosion.setActive(true);
        explosion.setVisible(true);
    }
}

class UIScene extends Phaser.Scene {
    constructor() {
        super("UIScene");
    }

    createUIElements(gameScene) {
        this.gameScene = gameScene;

        this.scoreText = this.add.text(10, 10, "Score 0", {
            font: '40px Arial',
            fill: '#000000'
        });

        this.healthBar = {};
        this.healthBar.outline = this.add.sprite(config.width / 2, config.height - 80, 'outline-big');
        this.healthBar.bar = this.add.sprite(config.width / 2, config.height - 80, 'bar-big');
        this.healthBar.mask = this.add.sprite(this.healthBar.bar.x, this.healthBar.bar.y, 'bar-big');
        this.healthBar.mask.visible = false;
        this.healthBar.bar.mask = new Phaser.Display.Masks.BitmapMask(this, this.healthBar.mask);
        this.healthBar.mask.offSet = 0;

        this.pauseButton = new Button(this, 650, 20, 'pauseButton', function () {
            this.scene.gameScene.scene.pause();
            this.scene.pauseMenu.setVisible(true);
        });

        this.add.existing(this.pauseButton);

        this.pauseMenu = new Menu(this, 240, 140, 300, 300, 'menuBackground', [
            new Button(this, 30, 30, 'playButton', function () {
                this.scene.gameScene.scene.resume();
                this.scene.pauseMenu.setVisible(false);
            }),
        ]);
        this.add.existing(this.pauseMenu);
        this.pauseMenu.setVisible(false);

        this.input.on('pointerup', function(pointer){
            pointer.lastBtn.clearTint();
        })
    }

    updateScoreText(score) {
        this.scoreText.setText('score: ' + score);
    }

    updateHealthBar(player) {
        this.healthBar.mask.offSet = this.healthBar.bar.width - (this.healthBar.bar.width * (1 - player.damageCount / player.damageMax));
        this.healthBar.mask.setPosition(this.healthBar.bar.x - this.healthBar.mask.offSet, this.healthBar.bar.y);
    }

}

class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
         //load in buttons
         this.load.image('playButton', 'assets/ui/play.png')
         this.load.image('pauseButton', 'assets/ui/pause.png')
         this.load.image('menuBackground', 'assets/ui/menuBox.png')

    }
    create() {
        this.mainMenu = new Menu(this, 30, 30, config.width - 60, config.height - 55, "menuBackground", [
            new Button(this, 30, 30, 'playButton', function () {
                this.scene.scene.start("GameScene");
            }),
        ])
        this.add.existing(this.mainMenu);

        this.input.on('pointerup', function(pointer){
            pointer.lastBtn.clearTint();
        })
    }
}