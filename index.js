/// <reference path="./index.d.ts" />
const fs = require('fs');
const bindings = require('bindings')('uinput');
const ioctl = require('ioctl');
const os = require('os');

/** @type {import('./index').InputEvent} */
const inputEvent = bindings.input_event;
/** @type {import('./index')['events']} */
const events = bindings.events;

let writeUInt16 = /** @type {'writeUInt16LE' | 'writeUInt16BE'} */
    ('writeUInt16' + os.endianness());

let writeInt32 = /** @type {'writeInt32LE' | 'writeInt32BE'} */
    ('writeInt32' + os.endianness());

// struct input_id {
//     __u16 bustype;
//     __u16 vendor;
//     __u16 product;
//     __u16 version;
// };

/**
 * @param {import('./index').CreateConfig['id']} options
 */
function inputId (options) {
    const buffer = Buffer.alloc(4 * 2);
    buffer[writeUInt16](options.busType, 0);
    buffer[writeUInt16](options.vendor, 2);
    buffer[writeUInt16](options.product, 4);
    buffer[writeUInt16](options.version, 6);
    return buffer;
}

/**
 * @param {string} name
 */
function deviceName (name = '') {
    const buf = Buffer.alloc(events.UINPUT_MAX_NAME_SIZE);
    buf.write(name, 0);
    return buf;
}

/**
 * @param {import('./index').Abs[]} absArr
 */
function absArray (absArr = []) {
    const buf = Buffer.alloc(events.ABS_CNT * 4);

    for (const abs of absArr) {
        buf[writeInt32](abs.value, abs.offset * 4);
    }

    return buf;
}

/**
 * @param {number} offset
 * @param {number} value
 * @returns {import('./index').Abs}
 */
function abs (offset, value) {
    return {
        offset: offset,
        value: value
    };
};

/**
 * @param {import('./index').CreateConfig} options
 */
function uinputUserDev (options) {
    const name = deviceName(options.name);
    const id = inputId(options.id);

    const ffEffectsMax = Buffer.alloc(4);
    ffEffectsMax[writeInt32](options.ffEffectsMax || 0, 0);

    const absMax = absArray(options.absMax);
    const absMin = absArray(options.absMin);
    const absFuzz = absArray(options.absFuzz);
    const absFlat = absArray(options.absFlat);

    return Buffer.concat([
        name,
        id,
        ffEffectsMax,
        absMax,
        absMin,
        absFuzz,
        absFlat
    ]);
}

class UInput {
    /**
     * @param {import('fs').WriteStream} stream
     * @param {number} fd
     */
    constructor (stream, fd) {
        this.stream = stream;
        this.fd = fd;
    }

    async write (data) {
        if (this.stream.writableEnded) {
            throw new Error('Write to uinput after being destroyed.');
        }

        return await new Promise((resolve, reject) => {
            this.stream.once('error', reject);

            this.stream.write(data, (err) => {
                this.stream.removeListener('error', reject);

                if (err) {
                    return reject(err);
                }

                resolve();
            });
        });
    }

    async create (options) {
        if (!options.id) {
            throw new Error('Device id params is mandatory');
        }

        const userDev = uinputUserDev(options);

        return await new Promise((resolve, reject) => {
            this.stream.once('error', reject);

            this.stream.write(userDev, (err) => {
                if (ioctl(this.fd, events.UI_DEV_CREATE)) {
                    return reject(new Error('Could not create uinput device'));
                }

                this.stream.removeListener('error', reject);
                resolve();
            });
        });
    }

    async destroy () {
        return await new Promise((resolve, reject) => {
            if (ioctl(this.fd, events.UI_DEV_DESTROY)) {
                return reject(new Error('Could not destroy uinput device'));
            }

            this.stream.end(() => resolve());
        });
    }

    async sendEvent (type, code, value, syn = true) {
        await this.write(inputEvent(type, code, value));

        if (syn) {
            await this.write(inputEvent(events.EV_SYN, events.SYN_REPORT, 0));
        }
    }

    async keyEvent (code, press = true) {
        if (press) {
            await this.sendEvent(events.EV_KEY, code, 1);
        } else {
            await this.sendEvent(events.EV_KEY, code, 0);
        }
    }

    async emitCombo (code) {
        // Press each of the keys in series
        for (let i = 0; i < code.length; i++) {
            await this.sendEvent(events.EV_KEY, code[i], 1);
        }

        // Release them in reverse
        for (let i = code.length; i-- > 0;) {
            await this.sendEvent(events.EV_KEY, code[i], 0);
        }
    }
}

/**
 * @returns {Promise<UInput>}
 */
async function setup (options) {
    return await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream('/dev/uinput');
        stream.once('error', reject);

        stream.on('open', (fd) => {
            for (const [key, values] of Object.entries(options)) {
                const indexEvent = events[key];

                if (indexEvent === undefined) {
                    throw new RangeError(`'${key}' is not a valid event`);
                }

                for (const value of values || []) {
                    if (ioctl(fd, indexEvent, value)) {
                        throw new Error(`Could not setup: ${key}: ${value}`);
                    }
                }
            }

            stream.removeListener('error', reject);
            resolve(new UInput(stream, fd));
        });
    });
}

module.exports.events = events;
module.exports.abs = abs;
module.exports.setup = setup;
