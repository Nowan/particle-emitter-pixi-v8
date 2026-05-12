import { BlendModeBehavior } from '../../BlendMode';

// V8 uses string blend modes
const BLEND_MODE_OPTIONS = [
    'normal', 'add', 'multiply', 'screen',
    'overlay', 'darken', 'lighten', 'color-dodge',
    'color-burn', 'hard-light', 'soft-light', 'difference',
    'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];

function makeReadable(input: string)
{
    return input.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

BlendModeBehavior.editorConfig = {
    category: 'blend',
    title: 'Blend Mode',
    props: [
        {
            type: 'select',
            name: 'blendMode',
            title: 'Blend Mode',
            description: 'Blend mode of all particles. IMPORTANT - The WebGL renderer only supports the Normal, '
                + 'Add, Multiply and Screen blend modes. Anything else will silently act like Normal.',
            default: 'normal',
            options: BLEND_MODE_OPTIONS
                .map((key) => ({ value: key, label: makeReadable(key) })),
        },
    ],
};
