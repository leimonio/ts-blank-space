let x /**/        /**/ = 1 ;
//        ^^^^^^^^        ^

[]                   ;
// ^^^^^^^^^^^^^^^^^^

class C /**/     /*︎*/ extends Array/**/    /*︎*/              /*︎*/ {
//          ^^^^^                      ^^^     ^^^^^^^^^^^^^^
             field/**/        /**/ = "";
//  ^^^^^^^^          ^^^^^^^^
    static accessor f1;
            f2/**/ /**/        /*︎*/;
//  ^^^^^^^       ^    ^^^^^^^^

    method/**/   /*︎*/(/*︎*/        /**/ a  /*︎*/        /**/)/*︎*/      /*︎*/ {
//            ^^^         ^^^^^^^^      ^     ^^^^^^^^         ^^^^^^
    }
}

           
              
              

           
           
// ^^^^^^^^

/**/                                 
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

/**/                  
//  ^^^^^^^^^^^^^^^^^^

/**/                                 
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

import {                          deepEqual} from "node:assert";
//      ^^^^^^^^^^^^^^^^^^^^^^^^^

export {
    C,
           
//  ^^^^^^
}

                       
//  ^^^^^^^^^^^^^^^^^^^
