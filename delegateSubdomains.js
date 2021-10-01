const { promises: fs } = require('fs');

const chalk = require('chalk');
const Cloudflare = require('cloudflare');

function logger(prefix, color) {
    return (...args) => console.log(color(prefix), ...args);
}

(async () => {
    const debug = logger('debug', chalk.magentaBright);

    const zones = JSON.parse(await fs.readFile('./zones.json', 'utf-8'));
    debug('known zones:', zones);
    const cf = new Cloudflare({ token: process.env.CLOUDFLARE_TOKEN });

    for (const zone in zones) {
        const delegationLog = logger('delegation:' + zone, chalk.blueBright);
        const zoneId = zones[zone];

        debug('reading existing records for', zone);
        const records = (await cf.dnsRecords.browse(zoneId)).result;

        debug('reading record jsons for', zone);
        const recordJsons = await fs.readdir(`subdomains/${zone}`);
        const recordNames = recordJsons
            .filter(r => r !== '.gitkeep')
            .map(r => r.substring(0, r.length - 5) + '.should-get-to.work');

        debug('comparing records to those on cloudflare');
        const discrepencies = [];

        // missing records on local/remote
        for (const onCf of records) {
            const name = onCf.name;
            if (name === 'should-get-to.work') continue; // skip @
            const possibleLocalRecord = recordNames.find(r => r === name);
            if (!possibleLocalRecord) discrepencies.push({ name, local: true, id: onCf.id }); // local: true means file is missing locally
        }

        for (const local of recordNames) {
            const possibleRemoteRecord = records.find(r => r.name === local);
            if (!possibleRemoteRecord) discrepencies.push({ name: local, remote: true }); // remote: true means record is missing on cloudflare
        }

        delegationLog(discrepencies.length, 'records need to be updated');

        for (const discrepency of discrepencies) {
            if (discrepency.local) {
                debug('deleting', discrepency.id, `[${discrepency.name}]`);
                await cf.dnsRecords.del(zoneId, discrepency.id);
                delegationLog(discrepency.name, 'has been removed');
            } else if (discrepency.remote) {
                debug('issuing', discrepency.name);
                let correctedName = discrepency.name.substring(0, discrepency.name.length - zone.length - 1);
                const record = JSON.parse(await fs.readFile(`subdomains/${zone}/${correctedName}.json`));

                if (correctedName === '@') correctedName = 'should-get-to.work';
                await cf.dnsRecords.add(zoneId, {
                    type: record.type,
                    name: correctedName,
                    content: record.value,
                    proxied: record.proxied
                });
                delegationLog(discrepency.name, 'has been issued');
            }
        }
    }
})();
