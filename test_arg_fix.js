// test_arg_fix.js

// Mock DB
const mockDB = [
    { id: 1, phone: '542645280229', name: 'Renzo Original' },
    { id: 2, phone: '1234567890', name: 'Other' }
];

async function findContactMock(incomingPhone) {
    console.log(`🔎 Searching for: ${incomingPhone}`);

    // 1. Exact Match
    let found = mockDB.find(c => c.phone === incomingPhone);
    if (found) return found;

    // 2. Argentina Fix (549 -> 54)
    // If incoming is 549... check if we have 54...
    if (incomingPhone.startsWith('549')) {
        const altPhone = incomingPhone.replace('549', '54');
        console.log(`   Trying alternative: ${altPhone}`);
        found = mockDB.find(c => c.phone === altPhone);
        if (found) return found;
    }

    // 3. Reverse (Incoming is 54... check if DB has 549...)
    if (incomingPhone.startsWith('54') && !incomingPhone.startsWith('549')) {
        const altPhone = incomingPhone.replace('54', '549');
        console.log(`   Trying alternative: ${altPhone}`);
        found = mockDB.find(c => c.phone === altPhone);
        if (found) return found;
    }

    return null;
}

// Test Case 1: Incoming from Meta (549) matching existing DB (54)
const incomingFromMeta = '5492645280229';
const result1 = await findContactMock(incomingFromMeta);
console.log('Result 1:', result1 ? `✅ MATCH: ${result1.name}` : '❌ FAILED');

// Test Case 2: Exact match
const result2 = await findContactMock('1234567890');
console.log('Result 2:', result2 ? `✅ MATCH: ${result2.name}` : '❌ FAILED');

// Test Case 3: Random number
const result3 = await findContactMock('999999999');
console.log('Result 3:', result3 ? `✅ MATCH: ${result3.name}` : '❌ FAILED');
