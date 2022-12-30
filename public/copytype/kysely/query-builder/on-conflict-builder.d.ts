import { Expression } from '../expression/expression.js';
import { OnConflictNode } from '../operation-node/on-conflict-node.js';
import { OperationNodeSource } from '../operation-node/operation-node-source.js';
import { ComparisonOperatorExpression, OperandValueExpressionOrList, WhereGrouper } from '../parser/binary-operation-parser.js';
import { ExpressionOrFactory } from '../parser/expression-parser.js';
import { ReferenceExpression } from '../parser/reference-parser.js';
import { UpdateObject } from '../parser/update-set-parser.js';
import { AnyColumn } from '../util/type-utils.js';
import { WhereInterface } from './where-interface.js';
export declare class OnConflictBuilder<DB, TB extends keyof DB> implements WhereInterface<DB, TB> {
    #private;
    constructor(props: OnConflictBuilderProps);
    /**
     * Specify a single column as the conflict target.
     *
     * Also see the {@link columns}, {@link constraint} and {@link expression}
     * methods for alternative ways to specify the conflict target.
     */
    column(column: AnyColumn<DB, TB>): OnConflictBuilder<DB, TB>;
    /**
     * Specify a list of columns as the conflict target.
     *
     * Also see the {@link column}, {@link constraint} and {@link expression}
     * methods for alternative ways to specify the conflict target.
     */
    columns(columns: ReadonlyArray<AnyColumn<DB, TB>>): OnConflictBuilder<DB, TB>;
    /**
     * Specify a specific constraint by name as the conflict target.
     *
     * Also see the {@link column}, {@link columns} and {@link expression}
     * methods for alternative ways to specify the conflict target.
     */
    constraint(constraintName: string): OnConflictBuilder<DB, TB>;
    /**
     * Specify an expression as the conflict target.
     *
     * This can be used if the unique index is an expression index.
     *
     * Also see the {@link column}, {@link columns} and {@link constraint}
     * methods for alternative ways to specify the conflict target.
     */
    expression(expression: Expression<any>): OnConflictBuilder<DB, TB>;
    /**
     * Specify an index predicate for the index target.
     *
     * See {@link WhereInterface.where} for more info.
     */
    where<RE extends ReferenceExpression<DB, TB>>(lhs: RE, op: ComparisonOperatorExpression, rhs: OperandValueExpressionOrList<DB, TB, RE>): OnConflictBuilder<DB, TB>;
    /**
     * Adds a `where` clause to the query.
     *
     * Also see {@link orWhere}, {@link whereExists} and {@link whereRef}.
     *
     * ### Examples
     *
     * Find a row by column value:
     *
     * ```ts
     * const person = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where('id', '=', 100)
     *   .executeTakeFirst()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" where "id" = $1
     * ```
     *
     * Operator can be any supported operator or if the typings don't support it
     * you can always use
     *
     * ```ts
     * sql`your operator`
     * ```
     *
     * The next example uses the `>` operator:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where('id', '>', 100)
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" where "id" > $1
     * ```
     *
     * `where` methods don't change the type of the query. You can add
     * conditional statements easily by doing something like this:
     *
     * ```ts
     * let query = db
     *   .selectFrom('person')
     *   .selectAll()
     *
     * if (firstName) {
     *   // The query builder is immutable. Remember to reassign
     *   // the result back to the query variable.
     *   query = query.where('first_name', '=', firstName)
     * }
     *
     * const persons = await query.execute()
     * ```
     *
     * This is true for basically all methods execpt the `select` and
     * `returning`, that __do__ change the return type of the query.
     *
     * Both the first and third argument can also be subqueries.
     * A subquery is defined by passing a function and calling
     * the `selectFrom` method of the object passed into the
     * function:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where(
     *     (qb) => qb.selectFrom('pet')
     *       .select('pet.name')
     *       .whereRef('pet.owner_id', '=', 'person.id')
     *       .limit(1),
     *     '=',
     *     'Fluffy'
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select *
     * from "person"
     * where (
     *   select "pet"."name"
     *   from "pet"
     *   where "pet"."owner_id" = "person"."id"
     *   limit $1
     * ) = $2
     * ```
     *
     * A `where in` query can be built by using the `in` operator and an array
     * of values. The values in the array can also be subqueries or raw
     * {@link sql} expressions.
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where('person.id', 'in', [100, 200, 300])
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" where "id" in ($1, $2, $3)
     * ```
     *
     * If everything else fails, you can always use the {@link sql} tag
     * as any of the arguments, including the operator:
     *
     * ```ts
     * import { sql } from 'kysely'
     *
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where(
     *     sql`coalesce(first_name, last_name)`,
     *     'like',
     *     '%' + name + '%',
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person"
     * where coalesce(first_name, last_name) like $1
     * ```
     *
     * If you only pass one function argument to this method, it can be
     * used to create parentheses around other where statements:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where((qb) => qb
     *     .where('id', '=', 1)
     *     .orWhere('id', '=', 2)
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" (where "id" = 1 or "id" = 2)
     * ```
     *
     * In all examples above the columns were known at compile time
     * (except for the raw {@link sql} expressions). By default kysely only
     * allows you to refer to columns that exist in the database **and**
     * can be referred to in the current query and context.
     *
     * Sometimes you may want to refer to columns that come from the user
     * input and thus are not available at compile time.
     *
     * You have two options, the {@link sql} tag or `db.dynamic`. The example below
     * uses both:
     *
     * ```ts
     * import { sql } from 'kysely'
     * const { ref } = db.dynamic
     *
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where(ref(columnFromUserInput), '=', 1)
     *   .orWhere(sql.id(columnFromUserInput), '=', 2)
     *   .execute()
     * ```
     */
    where(grouper: WhereGrouper<DB, TB>): OnConflictBuilder<DB, TB>;
    where(expression: Expression<any>): OnConflictBuilder<DB, TB>;
    /**
     * Specify an index predicate for the index target.
     *
     * See {@link WhereInterface.whereRef} for more info.
     */
    whereRef(lhs: ReferenceExpression<DB, TB>, op: ComparisonOperatorExpression, rhs: ReferenceExpression<DB, TB>): OnConflictBuilder<DB, TB>;
    /**
     * Specify an index predicate for the index target.
     *
     * See {@link WhereInterface.orWhere} for more info.
     */
    orWhere<RE extends ReferenceExpression<DB, TB>>(lhs: RE, op: ComparisonOperatorExpression, rhs: OperandValueExpressionOrList<DB, TB, RE>): OnConflictBuilder<DB, TB>;
    /**
     * Adds an `or where` clause to the query. Otherwise works just like {@link where}.
     *
     * It's often necessary to wrap `or where` clauses in parentheses to control
     * precendence. You can use the one argument version of the `where` method
     * for that. See the examples.
     *
     * ### Examples
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where('id', '=', 1)
     *   .orWhere('id', '=', 2)
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" where "id" = 1 or "id" = 2
     * ```
     *
     * Grouping with parentheses:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where((qb) => qb
     *     .where('id', '=', 1)
     *     .orWhere('id', '=', 2)
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" (where "id" = 1 or "id" = 2)
     * ```
     *
     * Even the first `where` can be an `orWhere`. This is useful
     * if you are looping through a set of conditions:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where((qb) => qb
     *     .orWhere('id', '=', 1)
     *     .orWhere('id', '=', 2)
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" (where "id" = 1 or "id" = 2)
     * ```
     */
    orWhere(grouper: WhereGrouper<DB, TB>): OnConflictBuilder<DB, TB>;
    orWhere(expression: Expression<any>): OnConflictBuilder<DB, TB>;
    /**
     * Specify an index predicate for the index target.
     *
     * See {@link WhereInterface.orWhereRef} for more info.
     */
    orWhereRef(lhs: ReferenceExpression<DB, TB>, op: ComparisonOperatorExpression, rhs: ReferenceExpression<DB, TB>): OnConflictBuilder<DB, TB>;
    /**
     * Specify an index predicate for the index target.
     *
     * See {@link WhereInterface.whereExists} for more info.
     */
    whereExists(arg: ExpressionOrFactory<DB, TB, any>): OnConflictBuilder<DB, TB>;
    /**
     * Specify an index predicate for the index target.
     *
     * See {@link WhereInterface.whereNotExists} for more info.
     */
    whereNotExists(arg: ExpressionOrFactory<DB, TB, any>): OnConflictBuilder<DB, TB>;
    /**
     * Specify an index predicate for the index target.
     *
     * See {@link WhereInterface.orWhereExists} for more info.
     */
    orWhereExists(arg: ExpressionOrFactory<DB, TB, any>): OnConflictBuilder<DB, TB>;
    /**
     * Specify an index predicate for the index target.
     *
     * See {@link WhereInterface.orWhereNotExists} for more info.
     */
    orWhereNotExists(arg: ExpressionOrFactory<DB, TB, any>): OnConflictBuilder<DB, TB>;
    /**
     * Clears all where clauses from the query.
     *
     * ### Examples
     *
     * ```ts
     * db.selectFrom('person')
     *   .selectAll()
     *   .where('id','=',42)
     *   .clearWhere()
     * ```
     *
     * The generated SQL(PostgreSQL):
     *
     * ```sql
     * select * from "person"
     * ```
     */
    clearWhere(): OnConflictBuilder<DB, TB>;
    /**
     * Adds the "do nothing" conflict action.
     *
     * ### Examples
     *
     * ```ts
     * await db
     *   .insertInto('person')
     *   .values({ first_name, pic })
     *   .onConflict((oc) => oc
     *     .column('pic')
     *     .doNothing()
     *   )
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * insert into "person" ("first_name", "pic")
     * values ($1, $2)
     * on conflict ("pic") do nothing
     * ```
     */
    doNothing(): OnConflictDoNothingBuilder<DB, TB>;
    /**
     * Adds the "do update set" conflict action.
     *
     * ### Examples
     *
     * ```ts
     * await db
     *   .insertInto('person')
     *   .values({ first_name, pic })
     *   .onConflict((oc) => oc
     *     .column('pic')
     *     .doUpdateSet({ first_name })
     *   )
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * insert into "person" ("first_name", "pic")
     * values ($1, $2)
     * on conflict ("pic")
     * do update set "first_name" = $3
     * ```
     */
    doUpdateSet(updates: UpdateObject<OnConflictDatabase<DB, TB>, OnConflictTables<TB>, OnConflictTables<TB>>): OnConflictUpdateBuilder<OnConflictDatabase<DB, TB>, OnConflictTables<TB>>;
}
export interface OnConflictBuilderProps {
    readonly onConflictNode: OnConflictNode;
}
export declare type OnConflictDatabase<DB, TB extends keyof DB> = {
    [K in keyof DB | 'excluded']: K extends keyof DB ? DB[K] : DB[TB];
};
export declare type OnConflictTables<TB> = TB | 'excluded';
export declare class OnConflictDoNothingBuilder<DB, TB extends keyof DB> implements OperationNodeSource {
    #private;
    constructor(props: OnConflictBuilderProps);
    toOperationNode(): OnConflictNode;
}
export declare class OnConflictUpdateBuilder<DB, TB extends keyof DB> implements WhereInterface<DB, TB>, OperationNodeSource {
    #private;
    constructor(props: OnConflictBuilderProps);
    /**
     * Specify a where condition for the update operation.
     *
     * See {@link WhereInterface.where} for more info.
     */
    where<RE extends ReferenceExpression<DB, TB>>(lhs: RE, op: ComparisonOperatorExpression, rhs: OperandValueExpressionOrList<DB, TB, RE>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Adds a `where` clause to the query.
     *
     * Also see {@link orWhere}, {@link whereExists} and {@link whereRef}.
     *
     * ### Examples
     *
     * Find a row by column value:
     *
     * ```ts
     * const person = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where('id', '=', 100)
     *   .executeTakeFirst()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" where "id" = $1
     * ```
     *
     * Operator can be any supported operator or if the typings don't support it
     * you can always use
     *
     * ```ts
     * sql`your operator`
     * ```
     *
     * The next example uses the `>` operator:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where('id', '>', 100)
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" where "id" > $1
     * ```
     *
     * `where` methods don't change the type of the query. You can add
     * conditional statements easily by doing something like this:
     *
     * ```ts
     * let query = db
     *   .selectFrom('person')
     *   .selectAll()
     *
     * if (firstName) {
     *   // The query builder is immutable. Remember to reassign
     *   // the result back to the query variable.
     *   query = query.where('first_name', '=', firstName)
     * }
     *
     * const persons = await query.execute()
     * ```
     *
     * This is true for basically all methods execpt the `select` and
     * `returning`, that __do__ change the return type of the query.
     *
     * Both the first and third argument can also be subqueries.
     * A subquery is defined by passing a function and calling
     * the `selectFrom` method of the object passed into the
     * function:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where(
     *     (qb) => qb.selectFrom('pet')
     *       .select('pet.name')
     *       .whereRef('pet.owner_id', '=', 'person.id')
     *       .limit(1),
     *     '=',
     *     'Fluffy'
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select *
     * from "person"
     * where (
     *   select "pet"."name"
     *   from "pet"
     *   where "pet"."owner_id" = "person"."id"
     *   limit $1
     * ) = $2
     * ```
     *
     * A `where in` query can be built by using the `in` operator and an array
     * of values. The values in the array can also be subqueries or raw
     * {@link sql} expressions.
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where('person.id', 'in', [100, 200, 300])
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" where "id" in ($1, $2, $3)
     * ```
     *
     * If everything else fails, you can always use the {@link sql} tag
     * as any of the arguments, including the operator:
     *
     * ```ts
     * import { sql } from 'kysely'
     *
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where(
     *     sql`coalesce(first_name, last_name)`,
     *     'like',
     *     '%' + name + '%',
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person"
     * where coalesce(first_name, last_name) like $1
     * ```
     *
     * If you only pass one function argument to this method, it can be
     * used to create parentheses around other where statements:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where((qb) => qb
     *     .where('id', '=', 1)
     *     .orWhere('id', '=', 2)
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" (where "id" = 1 or "id" = 2)
     * ```
     *
     * In all examples above the columns were known at compile time
     * (except for the raw {@link sql} expressions). By default kysely only
     * allows you to refer to columns that exist in the database **and**
     * can be referred to in the current query and context.
     *
     * Sometimes you may want to refer to columns that come from the user
     * input and thus are not available at compile time.
     *
     * You have two options, the {@link sql} tag or `db.dynamic`. The example below
     * uses both:
     *
     * ```ts
     * import { sql } from 'kysely'
     * const { ref } = db.dynamic
     *
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where(ref(columnFromUserInput), '=', 1)
     *   .orWhere(sql.id(columnFromUserInput), '=', 2)
     *   .execute()
     * ```
     */
    where(grouper: WhereGrouper<DB, TB>): OnConflictUpdateBuilder<DB, TB>;
    where(expression: Expression<any>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Specify a where condition for the update operation.
     *
     * See {@link WhereInterface.whereRef} for more info.
     */
    whereRef(lhs: ReferenceExpression<DB, TB>, op: ComparisonOperatorExpression, rhs: ReferenceExpression<DB, TB>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Specify a where condition for the update operation.
     *
     * See {@link WhereInterface.orWhere} for more info.
     */
    orWhere<RE extends ReferenceExpression<DB, TB>>(lhs: RE, op: ComparisonOperatorExpression, rhs: OperandValueExpressionOrList<DB, TB, RE>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Adds an `or where` clause to the query. Otherwise works just like {@link where}.
     *
     * It's often necessary to wrap `or where` clauses in parentheses to control
     * precendence. You can use the one argument version of the `where` method
     * for that. See the examples.
     *
     * ### Examples
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where('id', '=', 1)
     *   .orWhere('id', '=', 2)
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" where "id" = 1 or "id" = 2
     * ```
     *
     * Grouping with parentheses:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where((qb) => qb
     *     .where('id', '=', 1)
     *     .orWhere('id', '=', 2)
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" (where "id" = 1 or "id" = 2)
     * ```
     *
     * Even the first `where` can be an `orWhere`. This is useful
     * if you are looping through a set of conditions:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .where((qb) => qb
     *     .orWhere('id', '=', 1)
     *     .orWhere('id', '=', 2)
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person" (where "id" = 1 or "id" = 2)
     * ```
     */
    orWhere(grouper: WhereGrouper<DB, TB>): OnConflictUpdateBuilder<DB, TB>;
    orWhere(expression: Expression<any>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Specify a where condition for the update operation.
     *
     * See {@link WhereInterface.orWhereRef} for more info.
     */
    orWhereRef(lhs: ReferenceExpression<DB, TB>, op: ComparisonOperatorExpression, rhs: ReferenceExpression<DB, TB>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Specify a where condition for the update operation.
     *
     * See {@link WhereInterface.whereExists} for more info.
     */
    whereExists(arg: ExpressionOrFactory<DB, TB, any>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Specify a where condition for the update operation.
     *
     * See {@link WhereInterface.whereNotExists} for more info.
     */
    whereNotExists(arg: ExpressionOrFactory<DB, TB, any>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Specify a where condition for the update operation.
     *
     * See {@link WhereInterface.orWhereExists} for more info.
     */
    orWhereExists(arg: ExpressionOrFactory<DB, TB, any>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Specify a where condition for the update operation.
     *
     * See {@link WhereInterface.orWhereNotExists} for more info.
     */
    orWhereNotExists(arg: ExpressionOrFactory<DB, TB, any>): OnConflictUpdateBuilder<DB, TB>;
    /**
     * Clears all where clauses from the query.
     *
     * ### Examples
     *
     * ```ts
     * db.selectFrom('person')
     *   .selectAll()
     *   .where('id','=',42)
     *   .clearWhere()
     * ```
     *
     * The generated SQL(PostgreSQL):
     *
     * ```sql
     * select * from "person"
     * ```
     */
    clearWhere(): OnConflictUpdateBuilder<DB, TB>;
    toOperationNode(): OnConflictNode;
}
