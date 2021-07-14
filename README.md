# node-uinput

Linux uinput nodejs wrapper

## Installation

```bash
npm install uinput
```

## Example

```js
const UInput = require('uinput');

const SETUP_OPTIONS = {
    UI_SET_EVBIT:  [
        UInput.events.EV_KEY,
        UInput.events.EV_SYN,
        UInput.events.EV_REL,
    ],
    UI_SET_RELBIT: [
        UInput.events.REL_X,
        UInput.events.REL_Y,
        UInput.events.REL_WHEEL,
        UInput.events.REL_HWHEEL,
    ],
    UI_SET_KEYBIT: [
        UInput.events.BTN_LEFT,
        UInput.events.BTN_RIGHT,
        UInput.events.BTN_MIDDLE,
        UInput.events.BTN_SIDE,
        UInput.events.BTN_EXTRA,
        UInput.events.KEY_H,
        UInput.events.KEY_E,
        UInput.events.KEY_L,
        UInput.events.KEY_O,
        UInput.events.KEY_CAPSLOCK,
        UInput.events.KEY_B,
        UInput.events.KEY_Y,
        UInput.events.KEY_SPACE,
    ],
};

const CREATE_OPTIONS = {
    name: 'myuinput',
    id: {
        busType: UInput.events.BUS_USB,
        vendor: 0x0,
        product: 0x0,
        version: 1
    },
};

async function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

class UInputMouse {
    static map = {
        left: UInput.events.BTN_LEFT,
        right: UInput.events.BTN_RIGHT,
        middle: UInput.events.BTN_MIDDLE,
        side: UInput.events.BTN_SIDE,
        extra: UInput.events.BTN_EXTRA,
    };

    runtime = Promise.resolve();
    delay = 2;
    device;

    constructor (device = undefined) {
        this.device = device;
    }

    async createDevice() {
        if (this.device) {
            return this.device;
        }

        this.device = await UInput.setup(SETUP_OPTIONS);
        await this.device.create(CREATE_OPTIONS);

        return this.device;
    }

    async moveMouse(x, y) {
        const device = await this.createDevice();

        await device.sendEvent(UInput.EV_REL, UInput.REL_X, x, false);
        await device.sendEvent(UInput.EV_REL, UInput.REL_Y, y, true);
        await sleep(this.delay);
    }

    async keyToggle(key, pressed) {
        if (UInputMouse.map[key] === undefined) {
            throw new RangeError(`Key '${key}' does not exist`);
        }

        const device = await this.createDevice();

        await device.keyEvent(UInputMouse.map[key], pressed);
        await sleep(this.delay);
    }
}

main().catch(console.error);

async function main () {
    console.log('Setting up input');
    const uinput = await UInput.setup(SETUP_OPTIONS);
    await uinput.create(CREATE_OPTIONS);

    console.log('Sleeping');
    await sleep(2000);
    console.log('Sending HELLO');
    await uinput.keyEvent(UInput.events.KEY_H, true);
    await uinput.keyEvent(UInput.events.KEY_H, false);
    await uinput.keyEvent(UInput.events.KEY_E, true);
    await uinput.keyEvent(UInput.events.KEY_E, false);
    await uinput.keyEvent(UInput.events.KEY_L, true);
    await uinput.keyEvent(UInput.events.KEY_L, false);
    await uinput.keyEvent(UInput.events.KEY_L, true);
    await uinput.keyEvent(UInput.events.KEY_L, false);
    await uinput.keyEvent(UInput.events.KEY_O, true);
    await uinput.keyEvent(UInput.events.KEY_O, false);

    console.log('Sleeping');
    await sleep(3000);

    const keys = [
        UInput.events.KEY_SPACE,
        UInput.events.KEY_CAPSLOCK,
        UInput.events.KEY_B,
        UInput.events.KEY_Y,
        UInput.events.KEY_E
    ];

    console.log('Sending key combo');
    await uinput.emitCombo(keys);

    console.log('Moving the mouse');
    const mouse = new UInputMouse(uinput);
    await mouse.moveMouse(0, 100);
    await mouse.keyToggle('right', true);
    await mouse.keyToggle('right', false);
    console.log('Done');
}
```

## API

### async UInput.setup(options)

* *options* `Object`
    * *event_type* where event_type can be `EV_KEY`, `EV_ABS`, `EV_REL`, etc. and it's an `Array` with the different events we want the uinput device to handle
* Returns a UInputClass on success

It configures the uinput device we are about to create.

### async UInputClass.create(options)

* *options* `Object`. See `uinput_user_dev` definition in linux/uinput.h
    * *name* `String` with the name of the device
    * *id* `Object`
        * *busType* `Number`
        * *vendor* `Number`
        * *product* `Number`
        * *version* `Number`
    * *ffEffectsMax* `Number`
    * *absMax* `Array` of `Numbers` of size: `UInput.ABS_CNT`
    * *absMin* `Array` of `Numbers` of size: `UInput.ABS_CNT`
    * *absFuzz* `Array` of `Numbers` of size: `UInput.ABS_CNT`
    * *absFlat* `Array` of `Numbers` of size: `UInput.ABS_CNT`

It creates the uinput device.

### async UInputClass.sendEvent(type, code, value, syn = true)

* *type* `Number`
* *code* `Number`
* *value* `Number`
* *syn* `Boolean`

It sends an event to the uinput device.

### async UInputClass.keyEvent(code, press = true)

* *code* `Number`
* *press* `Boolean`

Wrapper over send_event to simulate key presses and mouse clicks.

### async UInputClass.emitCombo(code)

* *code* `Array with any combination of keys`

It sends an event to the uinput device with the combination
keys generated.

### async UInputClass.destroy()

* *code* `Number`

It stops the uinput device.
