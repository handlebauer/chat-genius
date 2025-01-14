import { MENTION_TEMPLATES } from '@/lib/utils/mentions'

// Test users for both channels
export const testUsers = [
    {
        email: 'alice@test.com',
        name: 'Alice',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    },
    {
        email: 'bob@test.com',
        name: 'Bob',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    },
    {
        email: 'carol@test.com',
        name: 'Carol',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
    },
    {
        email: 'dave@test.com',
        name: 'Dave',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dave',
    },
]

// Casual messages for general channel - intentionally varied in style and grammar
export const generalMessages = [
    {
        content: 'hey everyone!! super excited to be here 🎉',
        sender: 'alice@test.com',
    },
    {
        content: "what's everyone up to this weekend?",
        sender: 'bob@test.com',
    },
    {
        content: 'omg just saw the new spiderman movie... INSANE',
        sender: 'carol@test.com',
    },
    {
        content:
            "k so who's down for lunch tmrw?? thinking that new thai place",
        sender: 'dave@test.com',
    },
    {
        content: 'cant make it tomorrow 😭 got a dentist appt',
        sender: 'alice@test.com',
    },
    {
        content:
            'bruh moment... just spilled coffee all over my keyboard lmaooo',
        sender: 'bob@test.com',
    },
    {
        content: "anyone else's slack being weird rn??",
        sender: 'carol@test.com',
    },
    {
        content: 'yooo check out this tiktok i just saw https://tiktok.com/...',
        sender: 'dave@test.com',
    },
    {
        content: "fr fr that's hilarious 💀",
        sender: 'alice@test.com',
    },
    {
        content: "ngl these meetings could've been emails",
        sender: 'bob@test.com',
    },
    {
        content: 'did anyone save the zoom link from yesterday??',
        sender: 'carol@test.com',
    },
    {
        content: 'idk but the recording should be in the drive somewhere',
        sender: 'dave@test.com',
    },
    {
        content: 'btw whos going to the team dinner next week??',
        sender: 'alice@test.com',
    },
    {
        content: 'count me in! 🙋‍♂️',
        sender: 'bob@test.com',
    },
    {
        content: 'same!! but might be a bit late, got a thing before',
        sender: 'carol@test.com',
    },
]

// AI discussion messages - highly varied in topics and language patterns
export const aiMessages = [
    {
        content:
            'Our quantum computing simulation achieved 99.9% accuracy in predicting molecular structures. The quantum entanglement patterns were particularly fascinating.',
        sender: 'alice@test.com',
    },
    {
        content:
            "Just watched a street performer use AR to create a mind-bending illusion show. The crowd couldn't tell what was real anymore! 🎭",
        sender: 'bob@test.com',
    },
    {
        content:
            'My research on deep-sea bioluminescent organisms suggests they might be communicating in quantum patterns. Nature never ceases to amaze! 🌊',
        sender: 'carol@test.com',
    },
    {
        content:
            'Breaking: First successful brain-to-text interface allows locked-in patients to write poetry. One patient wrote a haiku about their experience.',
        sender: 'dave@test.com',
    },
    {
        content:
            'Ancient Mayan astronomical calculations match our quantum physics predictions about dark matter distribution. Mind = blown 🤯',
        sender: 'alice@test.com',
    },
    {
        content:
            'Just finished training an AI to compose jazz by analyzing butterfly flight patterns. The results are surprisingly melodic! 🦋🎷',
        sender: 'bob@test.com',
    },
    {
        content:
            "Our new sustainable fusion reactor uses plasma containment inspired by spider web tensile strength patterns. Nature's engineering at its finest!",
        sender: 'carol@test.com',
    },
    {
        content:
            'Virtual archaeologists reconstructed a complete Roman city using AI and scattered pottery fragments. You can now walk through it in VR!',
        sender: 'dave@test.com',
    },
    {
        content:
            'Breakthrough: DNA-based quantum computer solved protein folding in microseconds. This could revolutionize drug discovery! 🧬',
        sender: 'alice@test.com',
    },
    {
        content:
            'Teaching AI to understand human emotions through analysis of ancient cave paintings. The patterns across millennia are fascinating.',
        sender: 'bob@test.com',
    },
    {
        content:
            'New study: Plants might be using quantum networks in their root systems to share resources. The forest is literally a quantum internet! 🌳',
        sender: 'carol@test.com',
    },
    {
        content:
            "Just deployed swarms of nano-robots to clean ocean microplastics. They're using collective behavior algorithms based on coral polyps!",
        sender: 'dave@test.com',
    },
    {
        content:
            'Created an AI that translates whale songs into visual art. The patterns suggest complex narratives we never imagined! 🐋🎨',
        sender: 'alice@test.com',
    },
    {
        content:
            'Discovered that desert sand dunes exhibit quantum-like behavior at macro scales. Could explain mysterious migration patterns! 🏜️',
        sender: 'bob@test.com',
    },
    {
        content:
            'Using AI to decode ancient musical instruments - turns out they were used for mathematical calculations too! History meets computing 🎵',
        sender: 'carol@test.com',
    },
]
