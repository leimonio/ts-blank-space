


//^^^^^^^^^^^^^^^^

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

const {
    [(FOO            ).a]: a,
//       ^^^^^^^^^^^^
    [(FOO            ).b]: b,
//       ^^^^^^^^^^^^
    [(FOO            ).c]: c,
//       ^^^^^^^^^^^^
} = {}       ;
//    ^^^^^^^

const {
    data: {
        d,
        e,
        f,
    } = {}            ,
//        ^^^^^^^^^^^^
}           = FOO || {};
//^^^^^^^^^

(function({
    name,
    regex,
    uuidType = String            ,
//                    ^^^^^^^^^^^
}          ) {
//^^^^^^^^^
});

let g          ,
    h           ,
//   ^
    i          ;

(class {
    optionalMethod (v     ) {}
//                ^
});

((value         ) =>0||     { value });
//                   <const>{ value })

((value         ) =>0|| { value }.value);
//                   <A>{ value }.value);
