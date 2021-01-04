const UInput = require('../index');

const SETUP_OPTIONS = {
    EV_KEY: [
        UInput.events.BTN_LEFT,
        UInput.events.KEY_H,
        UInput.events.KEY_E,
        UInput.events.KEY_L,
        UInput.events.KEY_O,
        UInput.events.KEY_CAPSLOCK,
        UInput.events.KEY_B,
        UInput.events.KEY_Y,
        UInput.events.KEY_SPACE
    ],
    EV_REL: [UInput.events.REL_WHEEL, UInput.events.REL_HWHEEL],
    EV_ABS: [UInput.events.ABS_X, UInput.events.ABS_Y]
};

const CREATE_OPTIONS = {
    name: 'myuinput',
    id: {
        busType: UInput.events.BUS_VIRTUAL,
        vendor: 0x1,
        product: 0x1,
        version: 1
    },
    absMax: [
        UInput.abs(UInput.events.ABS_X, 1024),
        UInput.abs(UInput.events.ABS_Y, 1024)
    ]
};

async function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function main () {
    console.log('Setting up input');
    const uinput = await UInput.setup(SETUP_OPTIONS);
    await uinput.create(CREATE_OPTIONS);

    console.log('Sleeping');
    await sleep(2000);
    console.log('Sending HELLO');
    await uinput.keyEvent(UInput.events.KEY_H);
    await uinput.keyEvent(UInput.events.KEY_E);
    await uinput.keyEvent(UInput.events.KEY_L);
    await uinput.keyEvent(UInput.events.KEY_L);
    await uinput.keyEvent(UInput.events.KEY_O);

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
    console.log('Done');
}

(async () => {
    try {
        await main();
    } catch (err) {
        console.log(err);
    }
})();
