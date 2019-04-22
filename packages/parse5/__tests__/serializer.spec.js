const parse5 = require('../lib/index');
const unpad = require('../lib/utils/unpad');

describe('test serializer', () => {
    test('test serializer normal', () => {
        const source = unpad(`
        <div>
            <div>
                hehe
            </div>
            <div>
                <p>
                    this is me
                </p>
            </div>
        </div>`);
        const expected = unpad(`
        <div>
            <div>
                hehe
            </div>
            <div>
                <p on-click="{this.doSomething()}">
                    this is me
                </p>
            </div>
        </div>`);
        const documentFragment = parse5.parseFragment(source);
        documentFragment.childNodes[0].childNodes[3].childNodes[1].attrs.push({
            name: 'on-click',
            value: '{this.doSomething()}'
        });
        const str = parse5.serialize(documentFragment);
        expect(str).toBe(expected);
    });
    test('test serializer preTxt', () => {
        const source = unpad(`
        <div>
            <div>
                hehe
            </div>
            <div>
                <p>
                    this is me
                </p>
            </div>
        </div>`);
        const expected = unpad(`
        <div>
            <div>
                hehe
            </div>
            <div>
                {#if param}<p on-click="{this.doSomething()}">
                    this is me
                </p>
            </div>
        </div>`);
        const documentFragment = parse5.parseFragment(source);
        documentFragment.childNodes[0].childNodes[3].childNodes[1].attrs.push({
            name: 'on-click',
            value: '{this.doSomething()}'
        });
        documentFragment.childNodes[0].childNodes[3].childNodes[1].preTxt = '{#if param}';
        const str = parse5.serialize(documentFragment);
        expect(str).toBe(expected);
    });

    test('test serializer afterTxt', () => {
        const source = unpad(`
        <div>
            <div>
                hehe
            </div>
            <div>
                <p>
                    this is me
                </p>
            </div>
        </div>`);
        const expected = unpad(`
        <div>
            <div>
                hehe
            </div>
            <div>
                <p on-click="{this.doSomething()}">
                    this is me
                </p>{/if}
            </div>
        </div>`);
        const documentFragment = parse5.parseFragment(source);
        documentFragment.childNodes[0].childNodes[3].childNodes[1].attrs.push({
            name: 'on-click',
            value: '{this.doSomething()}'
        });
        documentFragment.childNodes[0].childNodes[3].childNodes[1].afterTxt = '{/if}';
        const str = parse5.serialize(documentFragment);
        expect(str).toBe(expected);
    });

    test('test serializer complex nest', () => {
        const source = unpad(`
        <div>
            <div>
                hehe
            </div>
            <div>
                <p>
                    this is me
                </p>
            </div>
        </div>`);
        const expected = unpad(`
        <div>
            <div>
                hehe
            </div>
            {#list list as item}<div>
                {#if param=='about'}<p on-click="{this.doSomething()}">
                    this is me
                </p>{/if}
            </div>{/list}
        </div>`);
        const documentFragment = parse5.parseFragment(source);
        documentFragment.childNodes[0].childNodes[3].childNodes[1].attrs.push({
            name: 'on-click',
            value: '{this.doSomething()}'
        });
        documentFragment.childNodes[0].childNodes[3].preTxt = '{#list list as item}';
        documentFragment.childNodes[0].childNodes[3].afterTxt = '{/list}';
        documentFragment.childNodes[0].childNodes[3].childNodes[1].preTxt = "{#if param=='about'}";
        documentFragment.childNodes[0].childNodes[3].childNodes[1].afterTxt = '{/if}';
        const str = parse5.serialize(documentFragment);
        expect(str).toBe(expected);
    });
});
