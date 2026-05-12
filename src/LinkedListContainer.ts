import { Container, Bounds, type UpdateTransformOptions } from 'pixi.js';

type DisplayObject = Container;

/** Interface for a child of a LinkedListContainer (has the prev/next properties added) */
export interface LinkedListChild extends DisplayObject
{
    nextChild: LinkedListChild|null;
    prevChild: LinkedListChild|null;
}

/**
 * A semi-experimental Container that uses a doubly linked list to manage children instead of an
 * array. This means that adding/removing children often is not the same performance hit that
 * it would to be continually pushing/splicing.
 * However, this is primarily intended to be used for heavy particle usage, and may not handle
 * edge cases well if used as a complete Container replacement.
 */
export class LinkedListContainer extends Container
{
    private _firstChild: LinkedListChild|null = null;
    private _lastChild: LinkedListChild|null = null;
    private _childCount = 0;

    public get firstChild(): LinkedListChild
    {
        return this._firstChild;
    }

    public get lastChild(): LinkedListChild
    {
        return this._lastChild;
    }

    public get childCount(): number
    {
        return this._childCount;
    }

    public addChild<T extends DisplayObject[]>(...children: T): T[0]
    {
        // if there is only one argument we can bypass looping through the them
        if (children.length > 1)
        {
            // loop through the array and add all children
            for (let i = 0; i < children.length; i++)
            {
                // eslint-disable-next-line prefer-rest-params
                this.addChild(children[i]);
            }
        }
        else
        {
            const child = children[0] as LinkedListChild;
            // if the child has a parent then lets remove it as PixiJS objects can only exist in one place

            if (child.parent)
            {
                child.parent.removeChild(child);
            }

            child.parent = this;
            this.sortDirty = true;

            // add to list if we have a list
            if (this._lastChild)
            {
                this._lastChild.nextChild = child;
                child.prevChild = this._lastChild;
                this._lastChild = child;
            }
            // otherwise initialize the list
            else
            {
                this._firstChild = this._lastChild = child;
            }

            // update child count
            ++this._childCount;

            // emit events
            this.emit('childAdded', child, this, this._childCount);
            child.emit('added', this);
        }

        return children[0];
    }

    public addChildAt<T extends DisplayObject>(child: T, index: number): T
    {
        if (index < 0 || index > this._childCount)
        {
            throw new Error(`addChildAt: The index ${index} supplied is out of bounds ${this._childCount}`);
        }

        if (child.parent)
        {
            child.parent.removeChild(child);
        }

        child.parent = this;
        this.sortDirty = true;

        const c = (child as any) as LinkedListChild;

        // if no children, do basic initialization
        if (!this._firstChild)
        {
            this._firstChild = this._lastChild = c;
        }
        // add at beginning (back)
        else if (index === 0)
        {
            this._firstChild.prevChild = c;
            c.nextChild = this._firstChild;
            this._firstChild = c;
        }
        // add at end (front)
        else if (index === this._childCount)
        {
            this._lastChild.nextChild = c;
            c.prevChild = this._lastChild;
            this._lastChild = c;
        }
        // otherwise we have to start counting through the children to find the right one
        // - SLOW, only provided to fully support the possibility of use
        else
        {
            let i = 0;
            let target = this._firstChild;

            while (i < index)
            {
                target = target.nextChild;
                ++i;
            }
            // insert before the target that we found at the specified index
            target.prevChild.nextChild = c;
            c.prevChild = target.prevChild;
            c.nextChild = target;
            target.prevChild = c;
        }

        // update child count
        ++this._childCount;

        // emit events
        child.emit('added', this);
        this.emit('childAdded', child, this, index);

        return child;
    }

    /**
     * Adds a child to the container to be rendered below another child.
     *
     * @param child The child to add
     * @param relative - The current child to add the new child relative to.
     * @return The child that was added.
     */
    public addChildBelow<T extends DisplayObject>(child: T, relative: DisplayObject): T
    {
        if (relative.parent !== this)
        {
            throw new Error(`addChildBelow: The relative target must be a child of this parent`);
        }

        if (child.parent)
        {
            child.parent.removeChild(child);
        }

        child.parent = this;
        this.sortDirty = true;

        // insert before the target that we were given
        (relative as LinkedListChild).prevChild.nextChild = (child as any as LinkedListChild);
        (child as any as LinkedListChild).prevChild = (relative as LinkedListChild).prevChild;
        (child as any as LinkedListChild).nextChild = (relative as LinkedListChild);
        (relative as LinkedListChild).prevChild = (child as any as LinkedListChild);
        if (this._firstChild === relative)
        {
            this._firstChild = (child as any as LinkedListChild);
        }

        // update child count
        ++this._childCount;

        // emit events
        this.emit('childAdded', child, this, this._childCount);
        child.emit('added', this);

        return child;
    }

    /**
     * Adds a child to the container to be rendered above another child.
     *
     * @param child The child to add
     * @param relative - The current child to add the new child relative to.
     * @return The child that was added.
     */
    public addChildAbove<T extends DisplayObject>(child: T, relative: DisplayObject): T
    {
        if (relative.parent !== this)
        {
            throw new Error(`addChildBelow: The relative target must be a child of this parent`);
        }

        if (child.parent)
        {
            child.parent.removeChild(child);
        }

        child.parent = this;
        this.sortDirty = true;

        // insert after the target that we were given
        (relative as LinkedListChild).nextChild.prevChild = (child as any as LinkedListChild);
        (child as any as LinkedListChild).nextChild = (relative as LinkedListChild).nextChild;
        (child as any as LinkedListChild).prevChild = (relative as LinkedListChild);
        (relative as LinkedListChild).nextChild = (child as any as LinkedListChild);
        if (this._lastChild === relative)
        {
            this._lastChild = (child as any as LinkedListChild);
        }

        // update child count
        ++this._childCount;

        // emit events
        this.emit('childAdded', child, this, this._childCount);
        child.emit('added', this);

        return child;
    }

    public swapChildren(child: DisplayObject, child2: DisplayObject): void
    {
        if (child === child2 || child.parent !== this || child2.parent !== this)
        {
            return;
        }

        const { prevChild, nextChild } = (child as LinkedListChild);

        (child as LinkedListChild).prevChild = (child2 as LinkedListChild).prevChild;
        (child as LinkedListChild).nextChild = (child2 as LinkedListChild).nextChild;
        (child2 as LinkedListChild).prevChild = prevChild;
        (child2 as LinkedListChild).nextChild = nextChild;

        if (this._firstChild === child)
        {
            this._firstChild = child2 as LinkedListChild;
        }
        else if (this._firstChild === child2)
        {
            this._firstChild = child as LinkedListChild;
        }
        if (this._lastChild === child)
        {
            this._lastChild = child2 as LinkedListChild;
        }
        else if (this._lastChild === child2)
        {
            this._lastChild = child as LinkedListChild;
        }
    }

    public getChildIndex(child: DisplayObject): number
    {
        let index = 0;
        let test = this._firstChild;

        while (test)
        {
            if (test === child)
            {
                break;
            }
            test = test.nextChild;
            ++index;
        }
        if (!test)
        {
            throw new Error('The supplied DisplayObject must be a child of the caller');
        }

        return index;
    }

    setChildIndex(child: DisplayObject, index: number): void
    {
        if (index < 0 || index >= this._childCount)
        {
            throw new Error(`The index ${index} supplied is out of bounds ${this._childCount}`);
        }
        if (child.parent !== this)
        {
            throw new Error('The supplied DisplayObject must be a child of the caller');
        }

        // remove child
        if ((child as LinkedListChild).nextChild)
        {
            (child as LinkedListChild).nextChild.prevChild = (child as LinkedListChild).prevChild;
        }
        if ((child as LinkedListChild).prevChild)
        {
            (child as LinkedListChild).prevChild.nextChild = (child as LinkedListChild).nextChild;
        }
        if (this._firstChild === (child as LinkedListChild))
        {
            this._firstChild = (child as LinkedListChild).nextChild;
        }
        if (this._lastChild === (child as LinkedListChild))
        {
            this._lastChild = (child as LinkedListChild).prevChild;
        }
        (child as LinkedListChild).nextChild = null;
        (child as LinkedListChild).prevChild = null;

        // do addChildAt
        if (!this._firstChild)
        {
            this._firstChild = this._lastChild = (child as LinkedListChild);
        }
        else if (index === 0)
        {
            this._firstChild.prevChild = (child as LinkedListChild);
            (child as LinkedListChild).nextChild = this._firstChild;
            this._firstChild = (child as LinkedListChild);
        }
        else if (index === this._childCount)
        {
            this._lastChild.nextChild = (child as LinkedListChild);
            (child as LinkedListChild).prevChild = this._lastChild;
            this._lastChild = (child as LinkedListChild);
        }
        else
        {
            let i = 0;
            let target = this._firstChild;

            while (i < index)
            {
                target = target.nextChild;
                ++i;
            }
            target.prevChild.nextChild = (child as LinkedListChild);
            (child as LinkedListChild).prevChild = target.prevChild;
            (child as LinkedListChild).nextChild = target;
            target.prevChild = (child as LinkedListChild);
        }
    }

    public removeChild<T extends DisplayObject[]>(...children: T): T[0]
    {
        // if there is only one argument we can bypass looping through the them
        if (children.length > 1)
        {
            // loop through the arguments property and remove all children
            for (let i = 0; i < children.length; i++)
            {
                this.removeChild(children[i]);
            }
        }
        else
        {
            const child = children[0] as LinkedListChild;

            // bail if not actually our child
            if (child.parent !== this) return null;

            child.parent = null;

            // swap out child references
            if (child.nextChild)
            {
                child.nextChild.prevChild = child.prevChild;
            }
            if (child.prevChild)
            {
                child.prevChild.nextChild = child.nextChild;
            }
            if (this._firstChild === child)
            {
                this._firstChild = child.nextChild;
            }
            if (this._lastChild === child)
            {
                this._lastChild = child.prevChild;
            }
            // clear sibling references
            child.nextChild = null;
            child.prevChild = null;

            // update child count
            --this._childCount;

            // emit events
            child.emit('removed', this);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.emit('childRemoved', child, this);
        }

        return children[0];
    }

    public getChildAt<T extends DisplayObject = DisplayObject>(index: number): T
    {
        if (index < 0 || index >= this._childCount)
        {
            throw new Error(`getChildAt: Index (${index}) does not exist.`);
        }

        if (index === 0)
        {
            return this._firstChild as unknown as T;
        }
        // add at end (front)
        else if (index === this._childCount)
        {
            return this._lastChild as unknown as T;
        }
        // otherwise we have to start counting through the children to find the right one
        // - SLOW, only provided to fully support the possibility of use
        let i = 0;
        let target = this._firstChild;

        while (i < index)
        {
            target = target.nextChild;
            ++i;
        }

        return target as unknown as T;
    }

    public removeChildAt<T extends DisplayObject = DisplayObject>(index: number): T
    {
        const child = this.getChildAt(index) as LinkedListChild;

        child.parent = null;
        // swap out child references
        if (child.nextChild)
        {
            child.nextChild.prevChild = child.prevChild;
        }
        if (child.prevChild)
        {
            child.prevChild.nextChild = child.nextChild;
        }
        if (this._firstChild === child)
        {
            this._firstChild = child.nextChild;
        }
        if (this._lastChild === child)
        {
            this._lastChild = child.prevChild;
        }
        // clear sibling references
        child.nextChild = null;
        child.prevChild = null;

        // update child count
        --this._childCount;

        // emit events
        child.emit('removed', this);
        this.emit('childRemoved', child, this, index);

        return child as unknown as T;
    }

    public removeChildren(beginIndex = 0, endIndex = this._childCount): DisplayObject[]
    {
        const begin = beginIndex;

        // because Container.destroy() has removeChildren(0, this.children.count), assume that an end index of 0
        // should actually be _childCount.
        if (endIndex === 0 && this._childCount > 0)
        {
            endIndex = this._childCount;
        }
        const end = endIndex;
        const range = end - begin;

        if (range > 0 && range <= end)
        {
            const removed: LinkedListChild[] = [];
            let child = this._firstChild;

            for (let i = 0; i <= end && child; ++i, child = child.nextChild)
            {
                if (i >= begin)
                {
                    removed.push(child);
                }
            }

            // child before removed section
            const prevChild = removed[0].prevChild;
            // child after removed section
            const nextChild = removed[removed.length - 1].nextChild;

            if (!nextChild)
            {
                // if we removed the last child, then the new last child is the one before
                // the removed section
                this._lastChild = prevChild;
            }
            else
            {
                // otherwise, stitch the child before the section to the child after
                nextChild.prevChild = prevChild;
            }
            if (!prevChild)
            {
                // if we removed the first child, then the new first child is the one after
                // the removed section
                this._firstChild = nextChild;
            }
            else
            {
                // otherwise stich the child after the section to the one before
                prevChild.nextChild = nextChild;
            }

            for (let i = 0; i < removed.length; ++i)
            {
                // clear parenting and sibling references for all removed children
                removed[i].parent = null;
                removed[i].nextChild = null;
                removed[i].prevChild = null;
            }

            for (let i = 0; i < removed.length; ++i)
            {
                removed[i].emit('removed', this);
                this.emit('childRemoved', removed[i], this, i);
            }

            return removed;
        }
        else if (range === 0 && this._childCount === 0)
        {
            return [];
        }

        throw new RangeError('removeChildren: numeric values are outside the acceptable range.');
    }

    /**
     * Updates the transform on all children of this container for rendering.
     * Updated for PixiJS v8
     */
    public override updateTransform(opts?: Partial<UpdateTransformOptions>): this
    {
        // Call parent implementation
        super.updateTransform(opts);

        // Update children using linked list
        let child;
        let next;

        for (child = this._firstChild; child; child = next)
        {
            next = child.nextChild;

            if (child.visible)
            {
                child.updateTransform(opts);
            }
        }

        return this;
    }

    /**
     * Retrieves the local bounds of the displayObject as a rectangle object. Updated for PixiJS v8
     */
    public override getLocalBounds(): Bounds
    {
        // Use parent implementation - v8 handles bounds differently
        return super.getLocalBounds();
    }

    /**
     * Note: In v8, rendering is handled automatically by the scene graph.
     * The linked list structure is maintained for efficient child management,
     * but rendering follows the standard Container pattern.
     */
}
