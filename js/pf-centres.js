/* Singapore preschool network: brands and centres.
   Sourced from each brand's official centre directory (July 2026):
   theschoolhouse.com.sg, learningvision.com, smallwonderpreschool.com,
   brightonmontessori.com.sg, agapelittleuni.com, theodyssey.global. */
(function () {
  'use strict';

  window.PF_CENTRES = [
    {
      brand: 'Agape Little Uni',
      centres: ['Choa Chu Kang', 'Clementi', 'Commonwealth', 'Compassvale', 'Jurong West',
        'Kallang', 'Sembawang (Gambas)', 'Sengkang', 'Tanjong Pagar', 'Thomson', 'Upper Serangoon']
    },
    {
      brand: 'Brighton Montessori',
      centres: ['Frankel', 'Hillview', 'Kovan', 'Mountbatten', 'River Valley',
        'River Valley (Crystal Court)', 'Sunset', 'Yio Chu Kang']
    },
    {
      brand: 'Learning Vision',
      centres: ['Changi Airport (Terminal 3)', 'Changi Business Park', 'Hwa Chong Institution',
        'Harbourlink Innohub (Pasir Panjang)', 'Lifelong Learning Institute (Paya Lebar)',
        'Nanyang Polytechnic', 'Ng Teng Fong General Hospital', 'NTU', 'NUHS',
        'Sengkang General Hospital', 'Sunshine Place (Choa Chu Kang)', 'Tan Tock Seng Hospital',
        'TechPoint (Ang Mo Kio)', 'Vista Point (Woodlands)', 'Woodlands Hospital']
    },
    {
      brand: 'Odyssey The Global Preschool',
      centres: ['Dempsey', 'Fourth Avenue', 'Loyang', 'Orchard', 'Still Road', 'Wilkinson']
    },
    {
      brand: 'Small Wonder',
      centres: ['Anchorvale', 'Ang Mo Kio', 'Bishan (Marymount)', 'Bukit Batok (Street 11)',
        'Bukit Batok (Street 22)', 'Bukit Gombak', 'Bukit Panjang', 'Bukit Timah', 'Buona Vista',
        'Changi (SUTD)', 'Choa Chu Kang', 'Chong Pang', 'Gambas (Nordcom II)',
        'International Business Park', 'Jurong East', 'Jurong West', 'Khatib', 'Lakeside',
        'Marine Parade', 'Nee Soon', 'Pioneer', 'Potong Pasir', 'Punggol', 'Queenstown',
        'Sengkang', 'Serangoon North', 'Sims', 'Taman Jurong', 'Tampines East (Changkat)',
        'Tampines North', 'Toa Payoh', 'Ubi', 'Woodlands Close', 'Woodlands Drive',
        'Yishun (Adora Green)', 'Yishun Central', 'Yishun St 71']
    },
    {
      brand: 'The Schoolhouse',
      centres: ['Alexandra', 'Aroozoo', 'Buckley', 'Dover', 'Gentle Road', 'Katong', 'Kovan',
        'Kovan 2', 'Mount Emily', 'Punggol Digital District', 'Ridgewood', 'River Valley',
        'Sembawang', 'West Coast']
    }
  ];

  /* Build a <select> with brand optgroups. Values look like
     "Brighton Montessori - Kovan". Includes an empty first option. */
  window.pfCentreSelect = function (opts) {
    opts = opts || {};
    var sel = document.createElement('select');
    if (opts.className) sel.className = opts.className;
    var o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = opts.placeholder || 'Select your centre (optional)';
    sel.appendChild(o0);
    window.PF_CENTRES.forEach(function (b) {
      var g = document.createElement('optgroup');
      g.label = b.brand;
      b.centres.forEach(function (c) {
        var o = document.createElement('option');
        o.value = b.brand + ' - ' + c;
        o.textContent = c;
        g.appendChild(o);
      });
      sel.appendChild(g);
    });
    if (opts.value) sel.value = opts.value;
    return sel;
  };
})();
