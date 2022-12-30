import { OperationNodeSource } from '../operation-node/operation-node-source.js';
import { CompiledQuery } from '../query-compiler/compiled-query.js';
import { JoinCallbackExpression, JoinReferenceExpression } from '../parser/join-parser.js';
import { TableExpression } from '../parser/table-parser.js';
import { SelectExpression } from '../parser/select-parser.js';
import { ReturningRow } from '../parser/returning-parser.js';
import { ReferenceExpression } from '../parser/reference-parser.js';
import { MergePartial, Nullable, SingleResultType } from '../util/type-utils.js';
import { Compilable } from '../util/compilable.js';
import { QueryExecutor } from '../query-executor/query-executor.js';
import { QueryId } from '../util/query-id.js';
import { KyselyPlugin } from '../plugin/kysely-plugin.js';
import { WhereInterface } from './where-interface.js';
import { ReturningInterface } from './returning-interface.js';
import { NoResultErrorConstructor } from './no-result-error.js';
import { DeleteResult } from './delete-result.js';
import { DeleteQueryNode } from '../operation-node/delete-query-node.js';
import { Selectable } from '../util/column-type.js';
import { OrderByDirectionExpression, OrderByExpression } from '../parser/order-by-parser.js';
import { Explainable, ExplainFormat } from '../util/explainable.js';
import { AliasedExpression, Expression } from '../expression/expression.js';
import { ComparisonOperatorExpression, OperandValueExpressionOrList, WhereGrouper } from '../parser/binary-operation-parser.js';
import { ExistsExpression } from '../parser/unary-operation-parser.js';
import { KyselyTypeError } from '../util/type-error.js';
export declare class DeleteQueryBuilder<DB, TB extends keyof DB, O> implements WhereInterface<DB, TB>, ReturningInterface<DB, TB, O>, OperationNodeSource, Compilable<O>, Explainable {
    #private;
    constructor(props: DeleteQueryBuilderProps);
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
    where<RE extends ReferenceExpression<DB, TB>>(lhs: RE, op: ComparisonOperatorExpression, rhs: OperandValueExpressionOrList<DB, TB, RE>): DeleteQueryBuilder<DB, TB, O>;
    where(grouper: WhereGrouper<DB, TB>): DeleteQueryBuilder<DB, TB, O>;
    where(expression: Expression<any>): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Adds a `where` clause where both sides of the operator are references
     * to columns.
     *
     * The normal `where` method treats the right hand side argument as a
     * value by default. `whereRef` treats it as a column reference. This method is
     * expecially useful with joins and correlated subqueries.
     *
     * ### Examples
     *
     * Usage with a join:
     *
     * ```ts
     * db.selectFrom(['person', 'pet'])
     *   .selectAll()
     *   .whereRef('person.first_name', '=', 'pet.name')
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person", "pet" where "person"."first_name" = "pet"."name"
     * ```
     *
     * Usage in a subquery:
     *
     * ```ts
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll('person')
     *   .select((qb) => qb
     *     .selectFrom('pet')
     *     .select('name')
     *     .whereRef('pet.owner_id', '=', 'person.id')
     *     .limit(1)
     *     .as('pet_name')
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select "person".*, (
     *   select "name"
     *   from "pet"
     *   where "pet"."owner_id" = "person"."id"
     *   limit $1
     * ) as "pet_name"
     * from "person"
     */
    whereRef(lhs: ReferenceExpression<DB, TB>, op: ComparisonOperatorExpression, rhs: ReferenceExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O>;
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
    orWhere<RE extends ReferenceExpression<DB, TB>>(lhs: RE, op: ComparisonOperatorExpression, rhs: OperandValueExpressionOrList<DB, TB, RE>): DeleteQueryBuilder<DB, TB, O>;
    orWhere(grouper: WhereGrouper<DB, TB>): DeleteQueryBuilder<DB, TB, O>;
    orWhere(expression: Expression<any>): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Adds an `or where` clause to the query. Otherwise works just like {@link whereRef}.
     *
     * Also see {@link orWhere} and {@link where}.
     */
    orWhereRef(lhs: ReferenceExpression<DB, TB>, op: ComparisonOperatorExpression, rhs: ReferenceExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Adds a `where exists` clause to the query.
     *
     * You can either use a subquery or a raw {@link sql} snippet.
     *
     * ### Examples
     *
     * The query below selets all persons that own a pet named Catto:
     *
     * ```ts
     * const petName = 'Catto'
     * const persons = await db
     *   .selectFrom('person')
     *   .selectAll()
     *   .whereExists((qb) => qb
     *     .selectFrom('pet')
     *     .select('pet.id')
     *     .whereRef('person.id', '=', 'pet.owner_id')
     *     .where('pet.name', '=', petName)
     *   )
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person"
     * where exists (
     *   select "pet"."id"
     *   from "pet"
     *   where "person"."id" = "pet"."owner_id"
     *   and "pet"."name" = $1
     * )
     * ```
     *
     * The same query as in the previous example but with using raw {@link sql}:
     *
     * ```ts
     * import { sql } from 'kysely'
     *
     * const petName = 'Catto'
     * db.selectFrom('person')
     *   .selectAll()
     *   .whereExists(
     *     sql`(select pet.id from pet where person.id = pet.owner_id and pet.name = ${petName})`
     *   )
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select * from "person"
     * where exists (
     *   select pet.id
     *   from pet
     *   where person.id = pet.owner_id
     *   and pet.name = $1
     * )
     * ```
     */
    whereExists(arg: ExistsExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Just like {@link whereExists} but creates a `not exists` clause.
     */
    whereNotExists(arg: ExistsExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Just like {@link whereExists} but creates an `or exists` clause.
     */
    orWhereExists(arg: ExistsExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Just like {@link whereExists} but creates an `or not exists` clause.
     */
    orWhereNotExists(arg: ExistsExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O>;
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
    clearWhere(): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Joins another table to the query using an inner join.
     *
     * ### Examples
     *
     * Simple usage by providing a table name and two columns to join:
     *
     * ```ts
     * const result = await db
     *   .selectFrom('person')
     *   .innerJoin('pet', 'pet.owner_id', 'person.id')
     *   // `select` needs to come after the call to `innerJoin` so
     *   // that you can select from the joined table.
     *   .select('person.id', 'pet.name')
     *   .execute()
     *
     * result[0].id
     * result[0].name
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select "person"."id", "pet"."name"
     * from "person"
     * inner join "pet"
     * on "pet"."owner_id" = "person"."id"
     * ```
     *
     * You can give an alias for the joined table like this:
     *
     * ```ts
     * await db.selectFrom('person')
     *   .innerJoin('pet as p', 'p.owner_id', 'person.id')
     *   .where('p.name', '=', 'Doggo')
     *   .selectAll()
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select *
     * from "person"
     * inner join "pet" as "p"
     * on "p"."owner_id" = "person"."id"
     * where "p".name" = $1
     * ```
     *
     * You can provide a function as the second argument to get a join
     * builder for creating more complex joins. The join builder has a
     * bunch of `on*` methods for building the `on` clause of the join.
     * There's basically an equivalent for every `where` method
     * (`on`, `onRef`, `onExists` etc.). You can do all the same things
     * with the `on` method that you can with the corresponding `where`
     * method. See the `where` method documentation for more examples.
     *
     * ```ts
     * await db.selectFrom('person')
     *   .innerJoin(
     *     'pet',
     *     (join) => join
     *       .onRef('pet.owner_id', '=', 'person.id')
     *       .on('pet.name', '=', 'Doggo')
     *   )
     *   .selectAll()
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select *
     * from "person"
     * inner join "pet"
     * on "pet"."owner_id" = "person"."id"
     * and "pet"."name" = $1
     * ```
     *
     * You can join a subquery by providing a select query (or a callback)
     * as the first argument:
     *
     * ```ts
     * await db.selectFrom('person')
     *   .innerJoin(
     *     qb.selectFrom('pet')
     *       .select(['owner_id', 'name'])
     *       .where('name', '=', 'Doggo')
     *       .as('doggos'),
     *     'doggos.owner_id',
     *     'person.id',
     *   )
     *   .selectAll()
     *   .execute()
     * ```
     *
     * The generated SQL (PostgreSQL):
     *
     * ```sql
     * select *
     * from "person"
     * inner join (
     *   select "owner_id", "name"
     *   from "pet"
     *   where "name" = $1
     * ) as "doggos"
     * on "doggos"."owner_id" = "person"."id"
     * ```
     */
    innerJoin<TE extends TableExpression<DB, TB>, K1 extends JoinReferenceExpression<DB, TB, TE>, K2 extends JoinReferenceExpression<DB, TB, TE>>(table: TE, k1: K1, k2: K2): DeleteQueryBuilderWithInnerJoin<DB, TB, O, TE>;
    innerJoin<TE extends TableExpression<DB, TB>, FN extends JoinCallbackExpression<DB, TB, TE>>(table: TE, callback: FN): DeleteQueryBuilderWithInnerJoin<DB, TB, O, TE>;
    /**
     * Just like {@link innerJoin} but adds a left join instead of an inner join.
     */
    leftJoin<TE extends TableExpression<DB, TB>, K1 extends JoinReferenceExpression<DB, TB, TE>, K2 extends JoinReferenceExpression<DB, TB, TE>>(table: TE, k1: K1, k2: K2): DeleteQueryBuilderWithLeftJoin<DB, TB, O, TE>;
    leftJoin<TE extends TableExpression<DB, TB>, FN extends JoinCallbackExpression<DB, TB, TE>>(table: TE, callback: FN): DeleteQueryBuilderWithLeftJoin<DB, TB, O, TE>;
    /**
     * Just like {@link innerJoin} but adds a right join instead of an inner join.
     */
    rightJoin<TE extends TableExpression<DB, TB>, K1 extends JoinReferenceExpression<DB, TB, TE>, K2 extends JoinReferenceExpression<DB, TB, TE>>(table: TE, k1: K1, k2: K2): DeleteQueryBuilderWithRightJoin<DB, TB, O, TE>;
    rightJoin<TE extends TableExpression<DB, TB>, FN extends JoinCallbackExpression<DB, TB, TE>>(table: TE, callback: FN): DeleteQueryBuilderWithRightJoin<DB, TB, O, TE>;
    /**
     * Just like {@link innerJoin} but adds a full join instead of an inner join.
     */
    fullJoin<TE extends TableExpression<DB, TB>, K1 extends JoinReferenceExpression<DB, TB, TE>, K2 extends JoinReferenceExpression<DB, TB, TE>>(table: TE, k1: K1, k2: K2): DeleteQueryBuilderWithFullJoin<DB, TB, O, TE>;
    fullJoin<TE extends TableExpression<DB, TB>, FN extends JoinCallbackExpression<DB, TB, TE>>(table: TE, callback: FN): DeleteQueryBuilderWithFullJoin<DB, TB, O, TE>;
    /**
     * Allows you to return data from modified rows.
     *
     * On supported databases like PostgreSQL, this method can be chained to
     * `insert`, `update` and `delete` queries to return data.
     *
     * Note that on SQLite you need to give aliases for the expressions to avoid
     * [this bug](https://sqlite.org/forum/forumpost/033daf0b32) in SQLite.
     * For example `.returning('id as id')`.
     *
     * Also see the {@link returningAll} method.
     *
     * ### Examples
     *
     * Return one column:
     *
     * ```ts
     * const { id } = await db
     *   .insertInto('person')
     *   .values({
     *     first_name: 'Jennifer',
     *     last_name: 'Aniston'
     *   })
     *   .returning('id')
     *   .executeTakeFirst()
     * ```
     *
     * Return multiple columns:
     *
     * ```ts
     * const { id, first_name } = await db
     *   .insertInto('person')
     *   .values({
     *     first_name: 'Jennifer',
     *     last_name: 'Aniston'
     *   })
     *   .returning(['id', 'last_name'])
     *   .executeTakeFirst()
     * ```
     *
     * Return arbitrary expressions:
     *
     * ```ts
     * import { sql } from 'kysely'
     *
     * const { id, full_name, first_pet_id } = await db
     *   .insertInto('person')
     *   .values({
     *     first_name: 'Jennifer',
     *     last_name: 'Aniston'
     *   })
     *   .returning([
     *     'id as id',
     *     sql<string>`concat(first_name, ' ', last_name)`.as('full_name'),
     *     (qb) => qb.selectFrom('pets').select('pet.id').limit(1).as('first_pet_id')
     *   ])
     *   .executeTakeFirst()
     * ```
     */
    returning<SE extends SelectExpression<DB, TB>>(selections: ReadonlyArray<SE>): DeleteQueryBuilder<DB, TB, ReturningRow<DB, TB, O, SE>>;
    returning<SE extends SelectExpression<DB, TB>>(selection: SE): DeleteQueryBuilder<DB, TB, ReturningRow<DB, TB, O, SE>>;
    /**
     * Adds a `returning *` to an insert/update/delete query on databases
     * that support `returning` such as PostgreSQL.
     */
    returningAll(): DeleteQueryBuilder<DB, TB, Selectable<DB[TB]>>;
    /**
     * Adds an `order by` clause to the query.
     *
     * `orderBy` calls are additive. To order by multiple columns, call `orderBy`
     * multiple times.
     *
     * The first argument is the expression to order by and the second is the
     * order (`asc` or `desc`).
     *
     * An `order by` clause in a delete query is only supported by some dialects
     * like MySQL.
     *
     * See {@link SelectQueryBuilder.orderBy} for more examples.
     *
     * ### Examples
     *
     * Delete 5 oldest items in a table:
     *
     * ```ts
     * await db
     *   .deleteFrom('pet')
     *   .orderBy('created_at')
     *   .limit(5)
     *   .execute()
     * ```
     *
     * The generated SQL (MySQL):
     *
     * ```sql
     * delete from `pet`
     * order by `created_at`
     * limit ?
     * ```
     */
    orderBy(orderBy: OrderByExpression<DB, TB, O>, direction?: OrderByDirectionExpression): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Adds a limit clause to the query.
     *
     * A limit clause in a delete query is only supported by some dialects
     * like MySQL.
     *
     * ### Examples
     *
     * Delete 5 oldest items in a table:
     *
     * ```ts
     * await db
     *   .deleteFrom('pet')
     *   .orderBy('created_at')
     *   .limit(5)
     *   .execute()
     * ```
     */
    limit(limit: number): DeleteQueryBuilder<DB, TB, O>;
    /**
     * Simply calls the given function passing `this` as the only argument.
     *
     * If you want to conditionally call a method on `this`, see
     * the {@link if} method.
     *
     * ### Examples
     *
     * The next example uses a helper function `log` to log a query:
     *
     * ```ts
     * function log<T extends Compilable>(qb: T): T {
     *   console.log(qb.compile())
     *   return qb
     * }
     *
     * db.deleteFrom('person')
     *   .call(log)
     *   .execute()
     * ```
     */
    call<T>(func: (qb: this) => T): T;
    /**
     * Call `func(this)` if `condition` is true.
     *
     * This method is especially handy with optional selects. Any `returning` or `returningAll`
     * method calls add columns as optional fields to the output type when called inside
     * the `func` callback. This is because we can't know if those selections were actually
     * made before running the code.
     *
     * You can also call any other methods inside the callback.
     *
     * ### Examples
     *
     * ```ts
     * async function deletePerson(id: number, returnLastName: boolean) {
     *   return await db
     *     .deleteFrom('person')
     *     .where('id', '=', id)
     *     .returning(['id', 'first_name'])
     *     .if(returnLastName, (qb) => qb.returning('last_name'))
     *     .executeTakeFirstOrThrow()
     * }
     * ```
     *
     * Any selections added inside the `if` callback will be added as optional fields to the
     * output type since we can't know if the selections were actually made before running
     * the code. In the example above the return type of the `deletePerson` function is:
     *
     * ```ts
     * {
     *   id: number
     *   first_name: string
     *   last_name?: string
     * }
     * ```
     */
    if<O2>(condition: boolean, func: (qb: this) => DeleteQueryBuilder<DB, TB, O2>): DeleteQueryBuilder<DB, TB, O2 extends DeleteResult ? DeleteResult : O extends DeleteResult ? Partial<O2> : MergePartial<O, O2>>;
    /**
     * Change the output type of the query.
     *
     * You should only use this method as the last resort if the types
     * don't support your use case.
     */
    castTo<T>(): DeleteQueryBuilder<DB, TB, T>;
    /**
     * Asserts that query's output row type equals the given type `T`.
     *
     * This method can be used to simplify excessively complex types to make typescript happy
     * and much faster.
     *
     * Kysely uses complex type magic to achieve its type safety. This complexity is sometimes too much
     * for typescript and you get errors like this:
     *
     * ```
     * error TS2589: Type instantiation is excessively deep and possibly infinite.
     * ```
     *
     * In these case you can often use this method to help typescript a little bit. When you use this
     * method to assert the output type of a query, Kysely can drop the complex output type that
     * consists of multiple nested helper types and replace it with the simple asserted type.
     *
     * Using this method doesn't reduce type safety at all. You have to pass in a type that is
     * structurally equal to the current type.
     *
     * ### Examples
     *
     * ```ts
     * const result = await db
     *   .with('deleted_person', (qb) => qb
     *     .deleteFrom('person')
     *     .where('id', '=', person.id)
     *     .returning('first_name')
     *     .assertType<{ first_name: string }>()
     *   )
     *   .with('deleted_pet', (qb) => qb
     *     .deleteFrom('pet')
     *     .where('owner_id', '=', person.id)
     *     .returning(['name as pet_name', 'species'])
     *     .assertType<{ pet_name: string, species: Species }>()
     *   )
     *   .selectFrom(['deleted_person', 'deleted_pet'])
     *   .selectAll()
     *   .executeTakeFirstOrThrow()
     * ```
     */
    assertType<T extends O>(): O extends T ? DeleteQueryBuilder<DB, TB, T> : KyselyTypeError<`assertType() call failed: The type passed in is not equal to the output type of the query.`>;
    /**
     * Returns a copy of this DeleteQueryBuilder instance with the given plugin installed.
     */
    withPlugin(plugin: KyselyPlugin): DeleteQueryBuilder<DB, TB, O>;
    toOperationNode(): DeleteQueryNode;
    compile(): CompiledQuery<O>;
    /**
     * Executes the query and returns an array of rows.
     *
     * Also see the {@link executeTakeFirst} and {@link executeTakeFirstOrThrow} methods.
     */
    execute(): Promise<O[]>;
    /**
     * Executes the query and returns the first result or undefined if
     * the query returned no result.
     */
    executeTakeFirst(): Promise<SingleResultType<O>>;
    /**
     * Executes the query and returns the first result or throws if
     * the query returned no result.
     *
     * By default an instance of {@link NoResultError} is thrown, but you can
     * provide a custom error class as the only argument to throw a different
     * error.
     */
    executeTakeFirstOrThrow(errorConstructor?: NoResultErrorConstructor): Promise<O>;
    /**
     * Executes query with `explain` statement before `delete` keyword.
     *
     * ```ts
     * const explained = await db
     *  .deleteFrom('person')
     *  .where('id', '=', 123)
     *  .explain('json')
     * ```
     *
     * The generated SQL (MySQL):
     *
     * ```sql
     * explain format=json delete from `person` where `id` = ?
     * ```
     */
    explain<ER extends Record<string, any> = Record<string, any>>(format?: ExplainFormat, options?: Expression<any>): Promise<ER[]>;
}
export interface DeleteQueryBuilderProps {
    readonly queryId: QueryId;
    readonly queryNode: DeleteQueryNode;
    readonly executor: QueryExecutor;
}
export declare type DeleteQueryBuilderWithInnerJoin<DB, TB extends keyof DB, O, TE extends TableExpression<DB, TB>> = TE extends `${infer T} as ${infer A}` ? T extends keyof DB ? InnerJoinedBuilder<DB, TB, O, A, DB[T]> : never : TE extends keyof DB ? DeleteQueryBuilder<DB, TB | TE, O> : TE extends AliasedExpression<infer QO, infer QA> ? InnerJoinedBuilder<DB, TB, O, QA, QO> : TE extends (qb: any) => AliasedExpression<infer QO, infer QA> ? InnerJoinedBuilder<DB, TB, O, QA, QO> : never;
declare type InnerJoinedBuilder<DB, TB extends keyof DB, O, A extends string, R> = A extends keyof DB ? DeleteQueryBuilder<InnerJoinedDB<DB, A, R>, TB | A, O> : DeleteQueryBuilder<DB & Record<A, R>, TB | A, O>;
declare type InnerJoinedDB<DB, A extends string, R> = {
    [C in keyof DB | A]: C extends A ? R : C extends keyof DB ? DB[C] : never;
};
export declare type DeleteQueryBuilderWithLeftJoin<DB, TB extends keyof DB, O, TE extends TableExpression<DB, TB>> = TE extends `${infer T} as ${infer A}` ? T extends keyof DB ? LeftJoinedBuilder<DB, TB, O, A, DB[T]> : never : TE extends keyof DB ? LeftJoinedBuilder<DB, TB, O, TE, DB[TE]> : TE extends AliasedExpression<infer QO, infer QA> ? LeftJoinedBuilder<DB, TB, O, QA, QO> : TE extends (qb: any) => AliasedExpression<infer QO, infer QA> ? LeftJoinedBuilder<DB, TB, O, QA, QO> : never;
declare type LeftJoinedBuilder<DB, TB extends keyof DB, O, A extends keyof any, R> = A extends keyof DB ? DeleteQueryBuilder<LeftJoinedDB<DB, A, R>, TB | A, O> : DeleteQueryBuilder<DB & Record<A, Nullable<R>>, TB | A, O>;
declare type LeftJoinedDB<DB, A extends keyof any, R> = {
    [C in keyof DB | A]: C extends A ? Nullable<R> : C extends keyof DB ? DB[C] : never;
};
export declare type DeleteQueryBuilderWithRightJoin<DB, TB extends keyof DB, O, TE extends TableExpression<DB, TB>> = TE extends `${infer T} as ${infer A}` ? T extends keyof DB ? RightJoinedBuilder<DB, TB, O, A, DB[T]> : never : TE extends keyof DB ? RightJoinedBuilder<DB, TB, O, TE, DB[TE]> : TE extends AliasedExpression<infer QO, infer QA> ? RightJoinedBuilder<DB, TB, O, QA, QO> : TE extends (qb: any) => AliasedExpression<infer QO, infer QA> ? RightJoinedBuilder<DB, TB, O, QA, QO> : never;
declare type RightJoinedBuilder<DB, TB extends keyof DB, O, A extends keyof any, R> = DeleteQueryBuilder<RightJoinedDB<DB, TB, A, R>, TB | A, O>;
declare type RightJoinedDB<DB, TB extends keyof DB, A extends keyof any, R> = {
    [C in keyof DB | A]: C extends A ? R : C extends TB ? Nullable<DB[C]> : C extends keyof DB ? DB[C] : never;
};
export declare type DeleteQueryBuilderWithFullJoin<DB, TB extends keyof DB, O, TE extends TableExpression<DB, TB>> = TE extends `${infer T} as ${infer A}` ? T extends keyof DB ? OuterJoinedBuilder<DB, TB, O, A, DB[T]> : never : TE extends keyof DB ? OuterJoinedBuilder<DB, TB, O, TE, DB[TE]> : TE extends AliasedExpression<infer QO, infer QA> ? OuterJoinedBuilder<DB, TB, O, QA, QO> : TE extends (qb: any) => AliasedExpression<infer QO, infer QA> ? OuterJoinedBuilder<DB, TB, O, QA, QO> : never;
declare type OuterJoinedBuilder<DB, TB extends keyof DB, O, A extends keyof any, R> = DeleteQueryBuilder<OuterJoinedBuilderDB<DB, TB, A, R>, TB | A, O>;
declare type OuterJoinedBuilderDB<DB, TB extends keyof DB, A extends keyof any, R> = {
    [C in keyof DB | A]: C extends A ? Nullable<R> : C extends TB ? Nullable<DB[C]> : C extends keyof DB ? DB[C] : never;
};
export {};
