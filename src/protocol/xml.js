const escapeXml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const unescapeXml = (value) => value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");

export const buildPacket = (name, attributes = {}) => {
    const serialized = Object.entries(attributes)
        .filter(([, value]) => value !== false && value !== null && value !== undefined)
        .map(([key, value]) => `${key}="${escapeXml(value)}"`)
        .join(" ");

    return serialized ? `<${name} ${serialized}/>` : `<${name}/>`;
};

export const parsePackets = (data) => {
    const packets = [];
    const packetPattern = /<([a-z0-9]+)([^<>]*?)\s*\/>/gi;
    let packetMatch;

    while ((packetMatch = packetPattern.exec(data)) !== null) {
        const attributes = {};
        const attributePattern = /([a-z0-9]+)="(.*?)"/gi;
        let attributeMatch;

        while ((attributeMatch = attributePattern.exec(packetMatch[2])) !== null) {
            attributes[attributeMatch[1]] = unescapeXml(attributeMatch[2]);
        }

        packets.push([packetMatch[1], attributes]);
    }

    return packets;
};
