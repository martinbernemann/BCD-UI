/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
package de.businesscode.bcdui.binding.rel.impl;

import de.businesscode.bcdui.binding.exc.BindingException;

public class IsLikeConstraintImpl extends BooleanConstraintImpl
{
  public static class BooleanConstraint extends BooleanConstraintImpl.BooleanConstraint {
    public BooleanConstraint(String pType) {
      super(pType);
    }
    /**
     * Logik is implemented in IsLikeConstraintIml
     */
    public static final Type ISLIKE = new BooleanConstraintImpl.BooleanConstraint("IsLike");
  }

  private final String prependToSecond;
  private final String appendToSecond;

  public IsLikeConstraintImpl(Type pType, boolean negate, String prependToSecond, String appendToSecond) {
    super(pType, negate);
    this.prependToSecond = prependToSecond;
    this.appendToSecond  = appendToSecond;
  }

  @Override
  protected String getOperator() throws BindingException {
    String op;
    if (getType() == BooleanConstraint.ISLIKE && isNegate())
      op = " NOT LIKE ";
    else if( getType() == BooleanConstraint.ISLIKE )
      op = " LIKE ";
    else
      throw new BindingException("Invalid type of Relation constraint: "+getName());
    return op;
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.impl.AbstractConstrain#getConstrainedStatement(String)
   */
  @Override
  public String getConstrainedStatement( String prepareCaseExpressionForAlias) throws BindingException {

    if (getStatement() == null) {
      StringBuilder str = new StringBuilder();

      if( prepareCaseExpressionForAlias != null )
        throw new BindingException("Like operator for relations cannot be used in translate join-to-case situations");
      if( getColumns().size()!=2 )
        throw new BindingException("Like operator for relations needs exactly 2 sides");

      // A small check for a common case error: we have a relation where both parts are indentical
      // Happens for example if a join condition does use twice the same binding item id and does not specify which is left and right, so we would say t1.col = t1.col here
      if( getColumns().get(0).getQColumnExpression().equals(getColumns().get(1).getQColumnExpression()) )
        throw new BindingException( "Ambiguous usage of bindingItem '"+getColumns().get(1).getName()+"'. You probably have to define left and right in a relation condition of the bindingSet '"+getColumns().get(1).getBindingSetName()+"'");

      // Left side as is
      str.append(getColumns().get(0).getQColumnExpression());
      str.append(getOperator());

      // Right side may be getting something (probably '%') pre and/or appended
      // Both expressions come from the BindingSet's XML, so no SQL injection issue here
      if(! prependToSecond.isEmpty())
        str.append("'").append(prependToSecond).append("'||");
      str.append(getColumns().get(1).getQColumnExpression());
      if(! appendToSecond.isEmpty())
        str.append("||'").append(appendToSecond).append("'");

      setStatement(str.toString());
    }

    return getStatement();
  }


  /**
   *
   * Method getMinimumParts
   *
   * @return
   */
  public int getMinimumParts() {
    return 2;
  }
}